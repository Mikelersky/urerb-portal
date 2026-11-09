<?php
// ============================================================================
// MMSU URERB Portal — Secure File Streaming & Dossier Bundle Service
// ============================================================================

declare(strict_types=1);

require_once __DIR__ . '/helpers/bootstrap.php';

$user = requireAuth();
$pdo = getDbConnection();

$uploadsDir = getUploadsDir();
$uploadsRealRoot = realpath($uploadsDir);

// ----------------------------------------------------------------------------
// 1. Dossier ZIP Bundle Streaming (?bundle=<protocol_code_or_id>)
// ----------------------------------------------------------------------------
if (!empty($_GET['bundle'])) {
    $bundleId = trim((string)$_GET['bundle']);

    if (ctype_digit($bundleId)) {
        $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? OR `protocol_code` = ? LIMIT 1');
        $stmt->execute([(int)$bundleId, $bundleId]);
    } else {
        $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `protocol_code` = ? LIMIT 1');
        $stmt->execute([$bundleId]);
    }

    $proto = $stmt->fetch();
    if (!$proto) {
        sendError('Protocol not found.', 404);
    }

    // Access check: owner or secretariat or admin
    $isOwner = ((int)$proto['primary_investigator_id'] === (int)$user['id']);
    $isSec = in_array($user['role'], ['secretariat', 'admin'], true);

    if (!$isOwner && !$isSec) {
        sendError('Access forbidden to this protocol bundle.', 403);
    }

    $docStmt = $pdo->prepare('SELECT * FROM `protocol_documents` WHERE `protocol_id` = ? AND `file_path` IS NOT NULL');
    $docStmt->execute([(int)$proto['id']]);
    $docs = $docStmt->fetchAll();

    $protoCode = $proto['protocol_code'] ?: "URERB-{$proto['id']}";
    $zipTemp = tempnam(sys_get_temp_dir(), 'urerb_zip_');
    $zip = new ZipArchive();

    if ($zip->open($zipTemp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        sendError('Failed to initialize archive creation.', 500);
    }

    // PI details
    $piStmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = ? LIMIT 1');
    $piStmt->execute([(int)$proto['primary_investigator_id']]);
    $pi = $piStmt->fetch() ?: [];

    // Add summary manifest
    $summary = "=======================================================================\n"
        . "MMSU UNIVERSITY RESEARCH ETHICS REVIEW BOARD (URERB)\n"
        . "OFFICIAL PROTOCOL SUBMISSION DOSSIER\n"
        . "=======================================================================\n\n"
        . "Protocol Code        : {$protoCode}\n"
        . "Title                : {$proto['title']}\n"
        . "Principal Investigator: {$pi['full_name']} ({$pi['email']})\n"
        . "Academic Unit        : {$proto['academic_unit']}\n"
        . "Review Track         : {$proto['review_track']}\n"
        . "Nature of Study      : {$proto['nature_study']}\n"
        . "Date Submitted       : {$proto['date_submitted']}\n"
        . "Current Status       : {$proto['status']} ({$proto['stage_label']})\n"
        . "Academic Year        : {$proto['academic_year']}\n"
        . "Clearance Cert No.   : " . ($proto['clearance_cert_no'] ?: 'Pending / Under Review') . "\n"
        . "Clearance Validity   : " . ($proto['clearance_validity'] ?: 'Pending') . "\n\n"
        . "Dossier Contents:\n";

    foreach ($docs as $idx => $d) {
        $realFile = realpath($uploadsRealRoot . DIRECTORY_SEPARATOR . basename($d['file_path']));
        if ($realFile && file_exists($realFile)) {
            $entryName = sprintf('%02d_%s_%s', $idx + 1, strtoupper($d['document_key']), basename($d['file_name']));
            $zip->addFile($realFile, $entryName);
            $summary .= sprintf("  [%02d] %s — %s (%s)\n", $idx + 1, $d['title'], $d['file_name'], $d['file_size']);
        }
    }

    $summary .= "\nGenerated automatically by MMSU URERB Portal on " . date('Y-m-d H:i:s') . "\n";
    $zip->addFromString('00_PROTOCOL_SUMMARY.txt', $summary);
    $zip->close();

    $zipFilename = "{$protoCode}_dossier.zip";

    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipFilename . '"');
    header('Content-Length: ' . filesize($zipTemp));
    header('Pragma: no-cache');
    header('Expires: 0');

    readfile($zipTemp);
    @unlink($zipTemp);
    exit;
}

// ----------------------------------------------------------------------------
// 2. Single Document Streaming (?id=<doc_id>[&download=1])
// ----------------------------------------------------------------------------
$docId = (int)($_GET['id'] ?? 0);
if ($docId <= 0) {
    sendError('Document ID is required.', 400);
}

$stmt = $pdo->prepare('SELECT d.*, p.primary_investigator_id, p.protocol_code FROM `protocol_documents` d JOIN `protocols` p ON d.protocol_id = p.id WHERE d.id = ? LIMIT 1');
$stmt->execute([$docId]);
$doc = $stmt->fetch();

if (!$doc || empty($doc['file_path'])) {
    sendError('Requested document record not found or no file uploaded.', 404);
}

// Access check: owner OR secretariat/admin OR assigned reviewer
$isOwner = ((int)$doc['primary_investigator_id'] === (int)$user['id']);
$isSec = in_array($user['role'], ['secretariat', 'admin'], true);

$isAssignedReviewer = false;
if ($user['role'] === 'reviewer') {
    $revCheck = $pdo->prepare('SELECT `id` FROM `review_assignments` WHERE `protocol_id` = ? AND `reviewer_id` = ? AND `status` != "Recused" LIMIT 1');
    $revCheck->execute([(int)$doc['protocol_id'], (int)$user['id']]);
    $isAssignedReviewer = (bool)$revCheck->fetchColumn();
}

if (!$isOwner && !$isSec && !$isAssignedReviewer) {
    sendError('Access forbidden to this document.', 403);
}

$fileName = basename($doc['file_path']);
$filePath = $uploadsRealRoot . DIRECTORY_SEPARATOR . $fileName;

if (!file_exists($filePath)) {
    sendError('File asset does not exist on storage vault.', 404);
}

$realFilePath = realpath($filePath);
if (!$realFilePath || !str_starts_with($realFilePath, $uploadsRealRoot . DIRECTORY_SEPARATOR)) {
    sendError('Security violation: invalid file path traversal attempt.', 400);
}

// Determine MIME type
$ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
$mimeTypes = [
    'pdf'  => 'application/pdf',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'doc'  => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
$mimeType = $mimeTypes[$ext] ?? 'application/octet-stream';

$download = !empty($_GET['download']) || in_array($ext, ['doc', 'docx'], true);
$disposition = $download ? 'attachment' : 'inline';
$clientFileName = $doc['file_name'] ?: basename($doc['file_path']);

header('X-Frame-Options: SAMEORIGIN');

// Safeguard: Check if this file has a .pdf extension but lacks the binary %PDF- magic bytes
if ($ext === 'pdf') {
    $headerBytes = file_get_contents($realFilePath, false, null, 0, 5);
    if ($headerBytes !== '%PDF-') {
        $rawText = file_get_contents($realFilePath);
        $docTitle = $doc['title'] ?: ($doc['file_name'] ?: 'Official Protocol Document');
        $metaText = "MMSU URERB PROTOCOL {$doc['protocol_code']} · VERSION " . ($doc['version'] ?: 'v1.0');
        $validPdf = createValidPdfStream($docTitle, $rawText, $metaText);

        header('Content-Type: application/pdf');
        header('Content-Disposition: ' . $disposition . '; filename="' . rawurlencode($clientFileName) . '"');
        header('Content-Length: ' . strlen($validPdf));
        header('Cache-Control: private, max-age=3600');
        header('Pragma: private');
        echo $validPdf;
        exit;
    }
}

header('Content-Type: ' . $mimeType);
header('Content-Disposition: ' . $disposition . '; filename="' . rawurlencode($clientFileName) . '"');
header('Content-Length: ' . filesize($realFilePath));
header('Cache-Control: private, max-age=3600');
header('Pragma: private');

readfile($realFilePath);
exit;


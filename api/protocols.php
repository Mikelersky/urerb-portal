<?php
// ============================================================================
// MMSU URERB Portal — Researcher Protocol Management Endpoints
// ============================================================================

declare(strict_types=1);

require_once __DIR__ . '/helpers/bootstrap.php';

$user = requireAuth();
$pdo = getDbConnection();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Helper to normalize review track
function cleanTrack(string $val): string
{
    if (str_contains($val, '(')) {
        $val = explode(' (', $val)[0];
    }
    $val = trim($val);
    $valid = ['Expedited Review', 'Full Board Review', 'Exempted Review'];
    return in_array($val, $valid, true) ? $val : 'Expedited Review';
}

// Helper to normalize nature of study
function cleanNature(string $val): string
{
    $val = strtolower(trim($val));
    if (str_contains($val, 'undergrad')) return 'undergrad';
    if (str_contains($val, 'master')) return 'masters';
    if (str_contains($val, 'dissert') || str_contains($val, 'phd') || str_contains($val, 'doctor')) return 'dissertation';
    if (str_contains($val, 'facult') || str_contains($val, 'inst')) return 'faculty';
    if (str_contains($val, 'extern') || str_contains($val, 'collab')) return 'external';
    return 'other';
}

// Helper to ensure baseline 7 document slots exist for a protocol
function ensureDocumentSlots(PDO $pdo, int $protocolId): void
{
    $docDefinitions = [
        'form15'     => ['title' => 'Form 15 — Application for Protocol Ethics Review', 'required' => 1],
        'form16'     => ['title' => 'Form 16 — Informed Consent Form (ICF) & Assent Forms', 'required' => 1],
        'form17'     => ['title' => 'Form 17 — Study Protocol & Data Gathering Instruments', 'required' => 1],
        'form13'     => ['title' => 'Form 13 — Curriculum Vitae & GCP Training Certificate', 'required' => 1],
        'form14'     => ['title' => 'Form 14 — Department Ethics Endorsement Sheet', 'required' => 1],
        'supporting' => ['title' => 'Supporting Documents (Permissions, MoU, IRB Clearances)', 'required' => 0],
        'receipt'    => ['title' => 'Official Cashier Payment Receipt', 'required' => 1],
    ];

    $checkDoc = $pdo->prepare('SELECT `id` FROM `protocol_documents` WHERE `protocol_id` = ? AND `document_key` = ? LIMIT 1');
    $insertDoc = $pdo->prepare('INSERT INTO `protocol_documents` (`protocol_id`, `document_key`, `title`, `is_required`, `status`) VALUES (?, ?, ?, ?, "Missing")');

    foreach ($docDefinitions as $key => $meta) {
        $checkDoc->execute([$protocolId, $key]);
        if (!$checkDoc->fetchColumn()) {
            $insertDoc->execute([$protocolId, $key, $meta['title'], $meta['required']]);
        }
    }
}

switch ($action) {
    case 'list':
        $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `primary_investigator_id` = ? ORDER BY `id` DESC');
        $stmt->execute([(int)$user['id']]);
        $rows = $stmt->fetchAll();

        $protocols = [];
        foreach ($rows as $r) {
            $protocols[] = formatProtocolForResearcher($pdo, $r);
        }

        sendJson([
            'success'   => true,
            'protocols' => $protocols,
        ]);
        break;

    case 'get':
        $identifier = trim((string)($_GET['id'] ?? ''));
        if ($identifier === '') {
            sendError('Protocol ID is required.', 400);
        }

        // Support lookup by int id or protocol_code or DRAFT-id
        if (str_starts_with($identifier, 'DRAFT-')) {
            $lookupId = (int)substr($identifier, 6);
            $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $stmt->execute([$lookupId]);
        } elseif (ctype_digit($identifier)) {
            $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? OR `protocol_code` = ? LIMIT 1');
            $stmt->execute([(int)$identifier, $identifier]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `protocol_code` = ? LIMIT 1');
            $stmt->execute([$identifier]);
        }

        $proto = $stmt->fetch();
        if (!$proto) {
            sendError('Protocol not found.', 404);
        }

        // Permission check: owner OR secretariat/admin OR assigned reviewer
        $isOwner = ((int)$proto['primary_investigator_id'] === (int)$user['id']);
        $isSecAdmin = in_array($user['role'], ['secretariat', 'admin'], true);

        $isAssigned = false;
        if ($user['role'] === 'reviewer') {
            $revCheck = $pdo->prepare('SELECT `id` FROM `review_assignments` WHERE `protocol_id` = ? AND `reviewer_id` = ? AND `status` != "Recused" LIMIT 1');
            $revCheck->execute([(int)$proto['id'], (int)$user['id']]);
            $isAssigned = (bool)$revCheck->fetchColumn();
        }

        if (!$isOwner && !$isSecAdmin && !$isAssigned) {
            sendError('Access forbidden to this protocol.', 403);
        }

        sendJson([
            'success'  => true,
            'protocol' => formatProtocolForResearcher($pdo, $proto),
        ]);
        break;

    case 'draft':
        $draftId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($draftId > 0) {
            $stmt = $pdo->prepare("SELECT * FROM `protocols` WHERE `id` = ? AND `primary_investigator_id` = ? AND `status` = 'Draft' LIMIT 1");
            $stmt->execute([$draftId, (int)$user['id']]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM `protocols` WHERE `primary_investigator_id` = ? AND `status` = 'Draft' ORDER BY `id` DESC LIMIT 1");
            $stmt->execute([(int)$user['id']]);
        }
        $draft = $stmt->fetch();

        sendJson([
            'success' => true,
            'draft'   => $draft ? formatProtocolForResearcher($pdo, $draft) : null,
        ]);
        break;

    case 'save-draft':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $draftId = !empty($body['id']) ? (int)$body['id'] : 0;

        // If no draft ID is explicitly provided, look up any existing active Draft for this researcher
        // to prevent creating duplicate multiple drafts on every save or step transition.
        if ($draftId <= 0) {
            $findDraft = $pdo->prepare("SELECT `id` FROM `protocols` WHERE `primary_investigator_id` = ? AND `status` = 'Draft' ORDER BY `id` DESC LIMIT 1");
            $findDraft->execute([(int)$user['id']]);
            $existingDraftId = (int)$findDraft->fetchColumn();
            if ($existingDraftId > 0) {
                $draftId = $existingDraftId;
            }
        }

        $title = trim((string)($body['title'] ?? 'Untitled Research Protocol'));
        $track = cleanTrack((string)($body['reviewType'] ?? $body['reviewTrack'] ?? 'Expedited Review'));
        $academicUnit = trim((string)($body['academicUnit'] ?? $user['college'] ?? 'College of Arts and Sciences (CAS) - Department of Biological Sciences'));
        if (str_contains($academicUnit, 'Other') && !empty($body['otherAcademicUnit'])) {
            $academicUnit = trim((string)$body['otherAcademicUnit']);
        }
        $academicUnitShort = null;
        if (preg_match('/\(([^)]+)\)/', $academicUnit, $m)) {
            $academicUnitShort = $m[1];
        }

        $nature = cleanNature((string)($body['natureStudy'] ?? 'faculty'));
        $natureOther = trim((string)($body['otherNatureStudy'] ?? ''));
        $fieldworkLocation = trim((string)($body['fieldworkLocation'] ?? ''));
        $isLabOnly = !empty($body['isLabOnly']) ? 1 : 0;
        $contactNumber = trim((string)($body['contactNumber'] ?? $user['contact_number'] ?? ''));
        $studySummary = trim((string)($body['studySummary'] ?? ''));
        $studyObjectives = trim((string)($body['studyObjectives'] ?? ''));
        $facultyAdviser = trim((string)($body['facultyAdviser'] ?? ''));
        $isIndependentPi = !empty($body['isIndependentPi']) ? 1 : 0;
        $activeStep = max(1, min(4, (int)($body['activeStep'] ?? 1)));
        $academicYear = getAcademicYear();

        $pdo->beginTransaction();
        try {
            if ($draftId > 0) {
                // Verify ownership and Draft status
                $check = $pdo->prepare("SELECT `id` FROM `protocols` WHERE `id` = ? AND `primary_investigator_id` = ? AND `status` = 'Draft' LIMIT 1");
                $check->execute([$draftId, (int)$user['id']]);
                if (!$check->fetchColumn()) {
                    throw new RuntimeException('Draft not found or not editable.');
                }

                $stmt = $pdo->prepare('UPDATE `protocols` SET `title` = ?, `review_track` = ?, `academic_unit` = ?, `academic_unit_short` = ?, `nature_study` = ?, `nature_study_other` = ?, `fieldwork_location` = ?, `is_lab_only` = ?, `contact_number` = ?, `study_summary` = ?, `study_objectives` = ?, `faculty_adviser` = ?, `is_independent_pi` = ?, `academic_year` = ?, `active_step` = ? WHERE `id` = ?');
                $stmt->execute([
                    $title,
                    $track,
                    $academicUnit,
                    $academicUnitShort,
                    $nature,
                    $natureOther,
                    $fieldworkLocation,
                    $isLabOnly,
                    $contactNumber,
                    $studySummary,
                    $studyObjectives,
                    $facultyAdviser,
                    $isIndependentPi,
                    $academicYear,
                    $activeStep,
                    $draftId,
                ]);
            } else {
                $stmt = $pdo->prepare('INSERT INTO `protocols` (`primary_investigator_id`, `title`, `review_track`, `academic_unit`, `academic_unit_short`, `nature_study`, `nature_study_other`, `fieldwork_location`, `is_lab_only`, `contact_number`, `study_summary`, `study_objectives`, `faculty_adviser`, `is_independent_pi`, `academic_year`, `active_step`, `status`, `status_category`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "Draft", "draft")');
                $stmt->execute([
                    (int)$user['id'],
                    $title,
                    $track,
                    $academicUnit,
                    $academicUnitShort,
                    $nature,
                    $natureOther,
                    $fieldworkLocation,
                    $isLabOnly,
                    $contactNumber,
                    $studySummary,
                    $studyObjectives,
                    $facultyAdviser,
                    $isIndependentPi,
                    $academicYear,
                    $activeStep,
                ]);
                $draftId = (int)$pdo->lastInsertId();
            }

            // Sync target populations
            $pdo->prepare('DELETE FROM `protocol_target_populations` WHERE `protocol_id` = ?')->execute([$draftId]);
            $targetPopulations = is_array($body['targetPopulations'] ?? null) ? $body['targetPopulations'] : [];
            $otherTargetPop = trim((string)($body['otherTargetPop'] ?? ''));
            $popInsert = $pdo->prepare('INSERT INTO `protocol_target_populations` (`protocol_id`, `cohort_key`, `custom_specification`) VALUES (?, ?, ?)');
            $validCohorts = ['minors', 'indigenous', 'patients', 'pregnant', 'elderly', 'pwd', 'generalAdults', 'notApplicable', 'other'];
            foreach ($targetPopulations as $cohort) {
                if (in_array($cohort, $validCohorts, true)) {
                    $spec = ($cohort === 'other') ? $otherTargetPop : null;
                    $popInsert->execute([$draftId, $cohort, $spec]);
                }
            }

            // Sync co-investigators
            $pdo->prepare('DELETE FROM `protocol_co_investigators` WHERE `protocol_id` = ?')->execute([$draftId]);
            $coInvestigators = is_array($body['coInvestigators'] ?? null) ? $body['coInvestigators'] : [];
            $coInsert = $pdo->prepare('INSERT INTO `protocol_co_investigators` (`protocol_id`, `name`, `role`, `affiliation`) VALUES (?, ?, ?, ?)');
            foreach ($coInvestigators as $co) {
                $name = trim((string)($co['name'] ?? ''));
                if ($name !== '') {
                    $coInsert->execute([
                        $draftId,
                        $name,
                        trim((string)($co['role'] ?? 'Co-Investigator')),
                        trim((string)($co['affiliation'] ?? '')),
                    ]);
                }
            }

            // Ensure baseline 7 document slots exist
            ensureDocumentSlots($pdo, $draftId);

            $pdo->commit();

            $fetchStmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $fetchStmt->execute([$draftId]);
            $saved = $fetchStmt->fetch();

            sendJson([
                'success'    => true,
                'protocolId' => $draftId,
                'id'         => $draftId,
                'protocol'   => formatProtocolForResearcher($pdo, $saved),
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError('Failed to save draft: ' . $e->getMessage(), 500);
        }
        break;

    case 'upload-doc':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $protocolId = (int)($_POST['protocolId'] ?? 0);
        $documentKey = trim((string)($_POST['documentKey'] ?? ''));

        $allowedKeys = ['form15', 'form16', 'form17', 'form13', 'form14', 'supporting', 'receipt'];
        if (!in_array($documentKey, $allowedKeys, true)) {
            sendError('Invalid document key specified.', 400);
        }

        // If protocolId is missing or 0, automatically find or create an active Draft protocol!
        // The researcher never has to manually save a draft first before uploading.
        if ($protocolId <= 0) {
            $findDraft = $pdo->prepare("SELECT `id` FROM `protocols` WHERE `primary_investigator_id` = ? AND `status` = 'Draft' ORDER BY `id` DESC LIMIT 1");
            $findDraft->execute([(int)$user['id']]);
            $protocolId = (int)$findDraft->fetchColumn();

            if ($protocolId <= 0) {
                $ins = $pdo->prepare('INSERT INTO `protocols` (`primary_investigator_id`, `title`, `review_track`, `academic_year`, `active_step`, `status`, `status_category`) VALUES (?, "Untitled Research Protocol", "Expedited Review", ?, 3, "Draft", "draft")');
                $ins->execute([(int)$user['id'], getAcademicYear()]);
                $protocolId = (int)$pdo->lastInsertId();
                ensureDocumentSlots($pdo, $protocolId);
            }
        }

        // Check protocol ownership and state
        $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? AND `primary_investigator_id` = ? LIMIT 1');
        $stmt->execute([$protocolId, (int)$user['id']]);
        $proto = $stmt->fetch();

        if (!$proto) {
            sendError('Protocol not found or access denied.', 404);
        }

        $editableStatuses = ['Draft', 'PI Clarification', 'Revision Required'];
        if (!in_array($proto['status'], $editableStatuses, true)) {
            sendError('Documents cannot be uploaded for protocols currently under review.', 400);
        }

        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            sendError('File upload failed. Please ensure a valid file was provided.', 400);
        }

        $file = $_FILES['file'];
        $origName = basename($file['name']);
        $fileSize = (int)$file['size'];

        // Max 15MB
        if ($fileSize > 15 * 1024 * 1024) {
            sendError('File exceeds maximum allowable size of 15 MB.', 400);
        }

        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $allowedExts = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
        if (!in_array($ext, $allowedExts, true)) {
            sendError('Invalid file type. Only PDF, Word (.doc, .docx), and images (.png, .jpg) are accepted.', 400);
        }

        // Format human file size
        $formattedSize = $fileSize < 1048576
            ? round($fileSize / 1024, 1) . ' KB'
            : round($fileSize / 1048576, 2) . ' MB';

        // Save file with secure unique name
        $uploadsDir = getUploadsDir();
        $safeFileName = sprintf(
            'p%d_%s_%s_%s.%s',
            $protocolId,
            $documentKey,
            date('YmdHis'),
            bin2hex(random_bytes(4)),
            $ext
        );
        $targetPath = $uploadsDir . DIRECTORY_SEPARATOR . $safeFileName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            sendError('Failed to store uploaded file on server.', 500);
        }

        // Upsert protocol_documents
        $docTitles = [
            'form15'     => 'Form 15 — Application for Protocol Ethics Review',
            'form16'     => 'Form 16 — Informed Consent Form (ICF) & Assent Forms',
            'form17'     => 'Form 17 — Study Protocol & Data Gathering Instruments',
            'form13'     => 'Form 13 — Curriculum Vitae & GCP Training Certificate',
            'form14'     => 'Form 14 — Department Ethics Endorsement Sheet',
            'supporting' => 'Supporting Documents (Permissions, MoU, IRB Clearances)',
            'receipt'    => 'Official Cashier Payment Receipt',
        ];

        $title = $docTitles[$documentKey] ?? 'Study Document';
        $isRequired = ($documentKey === 'supporting') ? 0 : 1;

        $check = $pdo->prepare('SELECT `id`, `file_path` FROM `protocol_documents` WHERE `protocol_id` = ? AND `document_key` = ? LIMIT 1');
        $check->execute([$protocolId, $documentKey]);
        $existing = $check->fetch();

        if ($existing) {
            // Delete old file if existed
            if (!empty($existing['file_path'])) {
                $oldFile = $uploadsDir . DIRECTORY_SEPARATOR . basename($existing['file_path']);
                if (file_exists($oldFile)) {
                    @unlink($oldFile);
                }
            }

            $update = $pdo->prepare('UPDATE `protocol_documents` SET `file_name` = ?, `file_path` = ?, `file_size` = ?, `status` = "Uploaded", `issue_text` = NULL, `uploaded_at` = NOW() WHERE `id` = ?');
            $update->execute([$origName, $safeFileName, $formattedSize, (int)$existing['id']]);
            $docId = (int)$existing['id'];
        } else {
            $insert = $pdo->prepare('INSERT INTO `protocol_documents` (`protocol_id`, `document_key`, `title`, `file_name`, `file_path`, `file_size`, `is_required`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?, "Uploaded")');
            $insert->execute([$protocolId, $documentKey, $title, $origName, $safeFileName, $formattedSize, $isRequired]);
            $docId = (int)$pdo->lastInsertId();
        }

        $fresh = $pdo->prepare('SELECT * FROM `protocol_documents` WHERE `id` = ? LIMIT 1');
        $fresh->execute([$docId]);
        $docRow = $fresh->fetch();

        sendJson([
            'success'    => true,
            'protocolId' => $protocolId,
            'id'         => $protocolId,
            'message'    => 'Document uploaded successfully.',
            'document'   => formatDocumentRow($docRow, $proto['protocol_code'] ?? null),
        ]);
        break;

    case 'submit':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);
        if ($protocolId <= 0) {
            sendError('Protocol ID is required for submission.', 400);
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM `protocols` WHERE `id` = ? AND `primary_investigator_id` = ? AND `status` = 'Draft' FOR UPDATE");
            $stmt->execute([$protocolId, (int)$user['id']]);
            $proto = $stmt->fetch();

            if (!$proto) {
                throw new RuntimeException('Protocol not found or is already submitted.');
            }

            // Verify required documents
            $docStmt = $pdo->prepare('SELECT * FROM `protocol_documents` WHERE `protocol_id` = ?');
            $docStmt->execute([$protocolId]);
            $docs = $docStmt->fetchAll();

            $docMap = [];
            foreach ($docs as $d) {
                $docMap[$d['document_key']] = $d;
            }

            $requiredKeys = ['form15', 'form16', 'form17', 'form13', 'form14', 'receipt'];
            $missingKeys = [];
            foreach ($requiredKeys as $req) {
                if (empty($docMap[$req]) || empty($docMap[$req]['file_path']) || $docMap[$req]['status'] === 'Missing') {
                    $missingKeys[] = strtoupper($req);
                }
            }

            if (!empty($missingKeys)) {
                throw new RuntimeException('Cannot submit protocol: missing required mandatory documents (' . implode(', ', $missingKeys) . ').');
            }

            // Clean up unuploaded supporting row
            if (isset($docMap['supporting']) && empty($docMap['supporting']['file_path'])) {
                $delSupporting = $pdo->prepare("DELETE FROM `protocol_documents` WHERE `protocol_id` = ? AND `document_key` = 'supporting' AND `file_path` IS NULL");
                $delSupporting->execute([$protocolId]);
            }

            // Generate sequential protocol code URERB-YYYY-NNN
            $year = date('Y');
            $codePrefix = "URERB-{$year}-";
            $seqStmt = $pdo->prepare("SELECT MAX(CAST(SUBSTRING_INDEX(protocol_code, '-', -1) AS UNSIGNED)) FROM `protocols` WHERE `protocol_code` LIKE ? FOR UPDATE");
            $seqStmt->execute(["{$codePrefix}%"]);
            $maxSeq = (int)$seqStmt->fetchColumn();
            $nextSeq = $maxSeq + 1;
            $protocolCode = sprintf('%s%03d', $codePrefix, $nextSeq);

            // Update protocol status
            $updStmt = $pdo->prepare('UPDATE `protocols` SET `protocol_code` = ?, `status` = "New Intake", `status_category` = "new", `stage_label` = "1. Secretariat Intake Review", `active_step` = 2, `date_submitted` = NOW(), `due_date` = DATE_ADD(CURDATE(), INTERVAL 2 DAY) WHERE `id` = ?');
            $updStmt->execute([$protocolCode, $protocolId]);

            // Update docs to Submitted
            $pdo->prepare('UPDATE `protocol_documents` SET `status` = "Submitted" WHERE `protocol_id` = ? AND `file_path` IS NOT NULL')->execute([$protocolId]);

            // Trail log
            addTrailLog(
                $pdo,
                $protocolId,
                (int)$user['id'],
                'Submission',
                "Formal study protocol dossier and forms submitted for URERB ethics review under code {$protocolCode}."
            );

            // Notify Secretariat
            notifyRoleUsers(
                $pdo,
                'secretariat',
                $protocolId,
                'New Protocol Intake Submission',
                "Protocol {$protocolCode} ({$proto['title']}) was submitted by {$user['full_name']} and awaits intake completeness check.",
                'update',
                'Intake Queue'
            );

            // Notify Researcher
            createNotification(
                $pdo,
                (int)$user['id'],
                $protocolId,
                'Protocol Submitted Successfully',
                "Your protocol {$protocolCode} has been officially received by the URERB Secretariat and queued for intake verification.",
                'update',
                'Track Protocol'
            );

            $pdo->commit();

            $fresh = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $fresh->execute([$protocolId]);
            $updatedProto = $fresh->fetch();

            sendJson([
                'success'      => true,
                'message'      => "Protocol {$protocolCode} submitted successfully.",
                'protocolCode' => $protocolCode,
                'protocol'     => formatProtocolForResearcher($pdo, $updatedProto),
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 400);
        }
        break;

    case 'submit-revision':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $protocolIdVal = trim((string)($_POST['protocolId'] ?? ''));
        $docKey = trim((string)($_POST['docKey'] ?? 'form15'));

        if ($protocolIdVal === '') {
            sendError('Protocol code is required.', 400);
        }

        // Fetch protocol
        if (ctype_digit($protocolIdVal)) {
            $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? OR `protocol_code` = ? LIMIT 1');
            $stmt->execute([(int)$protocolIdVal, $protocolIdVal]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `protocol_code` = ? LIMIT 1');
            $stmt->execute([$protocolIdVal]);
        }
        $proto = $stmt->fetch();

        if (!$proto || (int)$proto['primary_investigator_id'] !== (int)$user['id']) {
            sendError('Protocol not found or access denied.', 404);
        }

        $protoId = (int)$proto['id'];
        $protocolCode = $proto['protocol_code'] ?: "URERB-{$protoId}";

        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            sendError('Please upload a valid revised document file.', 400);
        }

        $file = $_FILES['file'];
        $origName = basename($file['name']);
        $fileSize = (int)$file['size'];

        if ($fileSize > 15 * 1024 * 1024) {
            sendError('File exceeds maximum allowable size of 15 MB.', 400);
        }

        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $allowedExts = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
        if (!in_array($ext, $allowedExts, true)) {
            sendError('Invalid file type. Only PDF, Word, and images are accepted.', 400);
        }

        $formattedSize = $fileSize < 1048576
            ? round($fileSize / 1024, 1) . ' KB'
            : round($fileSize / 1048576, 2) . ' MB';

        $uploadsDir = getUploadsDir();
        $safeFileName = sprintf(
            'p%d_rev_%s_%s_%s.%s',
            $protoId,
            $docKey,
            date('YmdHis'),
            bin2hex(random_bytes(4)),
            $ext
        );
        $targetPath = $uploadsDir . DIRECTORY_SEPARATOR . $safeFileName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            sendError('Failed to store revised document file.', 500);
        }

        $pdo->beginTransaction();
        try {
            // Update document record
            $updDoc = $pdo->prepare('UPDATE `protocol_documents` SET `file_name` = ?, `file_path` = ?, `file_size` = ?, `version` = "Revised", `status` = "Uploaded", `issue_text` = NULL, `uploaded_at` = NOW() WHERE `protocol_id` = ? AND `document_key` = ?');
            $updDoc->execute([$origName, $safeFileName, $formattedSize, $protoId, $docKey]);

            // Branch based on active stage
            if ((int)$proto['active_step'] <= 2 || $proto['status'] === 'PI Clarification') {
                // Secretariat intake clarification resubmission
                $protoUpd = $pdo->prepare('UPDATE `protocols` SET `status` = "Checking", `status_category` = "checking", `stage_label` = "1. Completeness Resubmission", `active_step` = 2, `due_date` = DATE_ADD(CURDATE(), INTERVAL 2 DAY) WHERE `id` = ?');
                $protoUpd->execute([$protoId]);

                addTrailLog(
                    $pdo,
                    $protoId,
                    (int)$user['id'],
                    'Submission',
                    "Principal Investigator submitted revised document ({$origName}) addressing intake clarification remarks."
                );

                notifyRoleUsers(
                    $pdo,
                    'secretariat',
                    $protoId,
                    'Intake Deficiency Resubmission',
                    "Revised document submitted for Protocol {$protocolCode} by {$user['full_name']}. Ready for re-checking.",
                    'update',
                    'Checking Queue'
                );
            } else {
                // Reviewer panel deliberation revision resubmission
                $protoUpd = $pdo->prepare('UPDATE `protocols` SET `status` = "Under Review", `status_category` = "assigned", `stage_label` = "4. Revisions Cleared", `active_step` = 4, `due_date` = DATE_ADD(CURDATE(), INTERVAL 7 DAY) WHERE `id` = ?');
                $protoUpd->execute([$protoId]);

                // Update active reviewer assignment
                $pdo->prepare('UPDATE `review_assignments` SET `status` = "In Progress" WHERE `protocol_id` = ? AND `status` != "Recused"')->execute([$protoId]);

                addTrailLog(
                    $pdo,
                    $protoId,
                    (int)$user['id'],
                    'Revision Sent',
                    "Principal Investigator uploaded revised study protocol documents ({$origName}) addressing Reviewer panel recommendations."
                );

                // Notify assigned reviewer & secretariat
                $revStmt = $pdo->prepare('SELECT `reviewer_id` FROM `review_assignments` WHERE `protocol_id` = ? AND `status` != "Recused"');
                $revStmt->execute([$protoId]);
                $reviewers = $revStmt->fetchAll();
                foreach ($reviewers as $rev) {
                    createNotification(
                        $pdo,
                        (int)$rev['reviewer_id'],
                        $protoId,
                        'Revised Protocol Resubmitted',
                        "Principal Investigator has uploaded revised materials for Protocol {$protocolCode}.",
                        'revision',
                        'Open Review'
                    );
                }

                notifyRoleUsers(
                    $pdo,
                    'secretariat',
                    $protoId,
                    'Protocol Revisions Uploaded',
                    "Revised documentation submitted by PI for Protocol {$protocolCode}.",
                    'update',
                    'Deliberation Queue'
                );
            }

            $pdo->commit();

            $fresh = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $fresh->execute([$protoId]);
            $updatedProto = $fresh->fetch();

            sendJson([
                'success'  => true,
                'message'  => 'Revised document submitted successfully.',
                'protocol' => formatProtocolForResearcher($pdo, $updatedProto),
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    case 'delete-draft':
    case 'delete-drafts':
        if ($method !== 'POST' && $method !== 'DELETE') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $targetIds = [];

        if (!empty($body['all']) || (!empty($_GET['all']) && $_GET['all'] === '1')) {
            // Fetch all draft IDs belonging to this researcher
            $allStmt = $pdo->prepare("SELECT `id` FROM `protocols` WHERE `primary_investigator_id` = ? AND `status` = 'Draft'");
            $allStmt->execute([(int)$user['id']]);
            $targetIds = $allStmt->fetchAll(PDO::FETCH_COLUMN);
        } elseif (!empty($body['ids']) && is_array($body['ids'])) {
            foreach ($body['ids'] as $rawId) {
                if (is_numeric($rawId) && (int)$rawId > 0) {
                    $targetIds[] = (int)$rawId;
                }
            }
        } else {
            $singleId = (int)($body['id'] ?? $_GET['id'] ?? 0);
            if ($singleId > 0) {
                $targetIds[] = $singleId;
            }
        }

        if (empty($targetIds)) {
            sendError('No valid draft ID(s) provided for deletion.', 400);
        }

        $uploadsDir = getUploadsDir();
        $deletedCount = 0;

        $pdo->beginTransaction();
        try {
            foreach ($targetIds as $tid) {
                $tid = (int)$tid;
                // Ensure protocol belongs to this user and is strictly in 'Draft' status
                $chkStmt = $pdo->prepare("SELECT `id`, `protocol_code`, `status` FROM `protocols` WHERE `id` = ? AND `primary_investigator_id` = ? LIMIT 1");
                $chkStmt->execute([$tid, (int)$user['id']]);
                $proto = $chkStmt->fetch();

                if (!$proto) {
                    continue;
                }

                if ($proto['status'] !== 'Draft') {
                    // Strict protection: NEVER delete non-drafts!
                    continue;
                }

                // Delete physical files attached to this draft
                $docFilesStmt = $pdo->prepare("SELECT `file_path` FROM `protocol_documents` WHERE `protocol_id` = ?");
                $docFilesStmt->execute([$tid]);
                $files = $docFilesStmt->fetchAll(PDO::FETCH_COLUMN);
                foreach ($files as $filePath) {
                    if (!empty($filePath)) {
                        $full = $uploadsDir . DIRECTORY_SEPARATOR . basename($filePath);
                        if (file_exists($full)) {
                            @unlink($full);
                        }
                    }
                }

                // Delete notifications attached to this draft protocol
                $pdo->prepare("DELETE FROM `notifications` WHERE `protocol_id` = ?")->execute([$tid]);

                // Delete protocol row (cascades to protocol_documents, target populations, co-investigators, trail logs)
                $delStmt = $pdo->prepare("DELETE FROM `protocols` WHERE `id` = ? AND `status` = 'Draft' AND `primary_investigator_id` = ?");
                $delStmt->execute([$tid, (int)$user['id']]);

                if ($delStmt->rowCount() > 0) {
                    $deletedCount++;
                }
            }

            $pdo->commit();

            sendJson([
                'success' => true,
                'count'   => $deletedCount,
                'message' => $deletedCount === 1
                    ? 'Draft protocol deleted successfully.'
                    : "{$deletedCount} draft protocols deleted successfully.",
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    default:
        sendError('Invalid protocol action.', 404);
}


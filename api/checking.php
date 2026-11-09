<?php
// ============================================================================
// MMSU URERB Portal — Secretariat Intake Checking Endpoints
// ============================================================================

declare(strict_types=1);

require_once __DIR__ . '/helpers/bootstrap.php';

$user = requireRole(['secretariat', 'admin']);
$pdo = getDbConnection();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'queue':
        $stmt = $pdo->query("SELECT * FROM `protocols` WHERE `status` != 'Draft' ORDER BY `id` DESC");
        $rows = $stmt->fetchAll();

        $protocols = [];
        foreach ($rows as $r) {
            $protocols[] = formatProtocolForSecretariat($pdo, $r);
        }

        sendJson([
            'success'   => true,
            'queue'     => $protocols,
            'protocols' => $protocols,
            'metrics'   => getSecretariatMetrics($pdo),
        ]);
        break;

    case 'toggle-doc':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $docId = (int)($body['documentId'] ?? $body['id'] ?? 0);
        $protocolId = (int)($body['protocolId'] ?? 0);
        $documentKey = trim((string)($body['documentKey'] ?? $body['key'] ?? ''));
        $status = trim((string)($body['status'] ?? 'Verified'));
        $issueText = trim((string)($body['issueText'] ?? ''));

        $allowedStatuses = ['Verified', 'Deficient', 'Missing', 'Uploaded', 'Submitted'];
        if (!in_array($status, $allowedStatuses, true)) {
            sendError('Invalid document verification status.', 400);
        }

        // If docId is provided, resolve protocolId and documentKey if missing
        if ($docId > 0 && ($protocolId <= 0 || $documentKey === '')) {
            $fDoc = $pdo->prepare('SELECT * FROM `protocol_documents` WHERE `id` = ? LIMIT 1');
            $fDoc->execute([$docId]);
            $existingDoc = $fDoc->fetch();
            if ($existingDoc) {
                $protocolId = (int)$existingDoc['protocol_id'];
                $documentKey = $existingDoc['document_key'];
            }
        }

        if ($protocolId <= 0 || ($docId <= 0 && $documentKey === '')) {
            sendError('Protocol ID and document identifier are required.', 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
        $stmt->execute([$protocolId]);
        $proto = $stmt->fetch();
        if (!$proto) {
            sendError('Protocol not found.', 404);
        }

        $pdo->beginTransaction();
        try {
            $updDoc = $pdo->prepare('UPDATE `protocol_documents` SET `status` = ?, `issue_text` = ? WHERE `protocol_id` = ? AND (`id` = ? OR `document_key` = ?)');
            $updDoc->execute([$status, $issueText ?: null, $protocolId, $docId, $documentKey]);

            // Auto-advance New Intake -> Checking on first action
            if ($proto['status'] === 'New Intake') {
                $updProto = $pdo->prepare('UPDATE `protocols` SET `status` = "Checking", `status_category` = "checking", `stage_label` = "1. Completeness Verification" WHERE `id` = ?');
                $updProto->execute([$protocolId]);
            }

            $pdo->commit();

            $fetchDoc = $pdo->prepare('SELECT * FROM `protocol_documents` WHERE `protocol_id` = ? AND (`id` = ? OR `document_key` = ?) LIMIT 1');
            $fetchDoc->execute([$protocolId, $docId, $documentKey]);
            $updatedDoc = $fetchDoc->fetch();

            sendJson([
                'success'  => true,
                'document' => formatDocumentRow($updatedDoc, $proto['protocol_code']),
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    case 'save-progress':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);
        if ($protocolId <= 0) {
            sendError('Protocol ID is required.', 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
        $stmt->execute([$protocolId]);
        $proto = $stmt->fetch();
        if (!$proto) {
            sendError('Protocol not found.', 404);
        }

        $pdo->beginTransaction();
        try {
            $docs = is_array($body['documents'] ?? null) ? $body['documents'] : [];
            $updDoc = $pdo->prepare('UPDATE `protocol_documents` SET `status` = ?, `issue_text` = ? WHERE `protocol_id` = ? AND (`document_key` = ? OR `id` = ?)');

            foreach ($docs as $d) {
                $key = trim((string)($d['key'] ?? $d['documentKey'] ?? ''));
                $docId = (int)($d['documentId'] ?? $d['id'] ?? 0);
                $status = trim((string)($d['status'] ?? 'Verified'));
                $issue = trim((string)($d['issueText'] ?? $d['remarks'] ?? ''));
                if ($key !== '' || $docId > 0) {
                    $updDoc->execute([$status, $issue ?: null, $protocolId, $key, $docId]);
                }
            }

            if ($proto['status'] === 'New Intake') {
                $pdo->prepare('UPDATE `protocols` SET `status` = "Checking", `status_category` = "checking", `stage_label` = "1. Completeness Verification" WHERE `id` = ?')->execute([$protocolId]);
            }

            $pdo->commit();

            $fresh = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $fresh->execute([$protocolId]);
            $saved = $fresh->fetch();

            sendJson([
                'success'  => true,
                'message'  => 'Checking progress saved.',
                'protocol' => formatProtocolForSecretariat($pdo, $saved),
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    case 'send-deficiency':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);
        $remarks = trim((string)($body['deficiencyRemarks'] ?? $body['remarks'] ?? ''));

        if ($protocolId <= 0) {
            sendError('Protocol ID is required.', 400);
        }

        $items = !empty($body['items']) && is_array($body['items'])
            ? $body['items']
            : (!empty($body['deficientDocs']) && is_array($body['deficientDocs']) ? $body['deficientDocs'] : []);

        if (empty($items) && $remarks === '') {
            sendError('Please select at least one form requiring correction or specify deficiency remarks.', 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
        $stmt->execute([$protocolId]);
        $proto = $stmt->fetch();
        if (!$proto) {
            sendError('Protocol not found.', 404);
        }

        $protocolCode = $proto['protocol_code'] ?: "URERB-{$protocolId}";
        $piId = (int)$proto['primary_investigator_id'];

        $pdo->beginTransaction();
        try {
            $updatedDocTitles = [];
            $deficientDocIds = [];
            if (!empty($items)) {
                $updDoc = $pdo->prepare('UPDATE `protocol_documents` SET `status` = "Deficient", `issue_text` = ? WHERE `protocol_id` = ? AND (`document_key` = ? OR `id` = ?)');
                foreach ($items as $it) {
                    $key = trim((string)($it['key'] ?? $it['documentKey'] ?? ''));
                    $docId = (int)($it['documentId'] ?? $it['id'] ?? 0);
                    $issue = trim((string)($it['issueText'] ?? $remarks));
                    if ($key !== '' || $docId > 0) {
                        $updDoc->execute([$issue, $protocolId, $key, $docId]);
                        $title = trim((string)($it['title'] ?? strtoupper($key)));
                        $updatedDocTitles[] = $title;
                        if ($docId > 0) {
                            $deficientDocIds[] = $docId;
                        } else {
                            // Find id by key
                            $findId = $pdo->prepare('SELECT `id` FROM `protocol_documents` WHERE `protocol_id` = ? AND `document_key` = ? LIMIT 1');
                            $findId->execute([$protocolId, $key]);
                            $foundDocId = (int)$findId->fetchColumn();
                            if ($foundDocId > 0) {
                                $deficientDocIds[] = $foundDocId;
                            }
                        }
                    }
                }

                // Any document for this protocol not flagged as deficient is set to Verified
                if (!empty($deficientDocIds)) {
                    $inPlaceholders = implode(',', array_fill(0, count($deficientDocIds), '?'));
                    $updOthers = $pdo->prepare("UPDATE `protocol_documents` SET `status` = 'Verified', `issue_text` = NULL WHERE `protocol_id` = ? AND `id` NOT IN ($inPlaceholders)");
                    $updOthers->execute(array_merge([$protocolId], $deficientDocIds));
                }
            }

            if ($remarks === '' && !empty($updatedDocTitles)) {
                $remarks = 'Specific corrections requested for: ' . implode(', ', $updatedDocTitles) . '.';
            }

            $summaryLogText = !empty($updatedDocTitles)
                ? sprintf("Intake deficiency notice issued for %d form(s) [%s]: %s", count($updatedDocTitles), implode(', ', $updatedDocTitles), $remarks)
                : "Intake deficiency notice issued: {$remarks}";

            $updProto = $pdo->prepare('UPDATE `protocols` SET `status` = "PI Clarification", `status_category` = "clarification", `stage_label` = "1. Intake Clarification Required", `remarks` = ?, `due_date` = DATE_ADD(CURDATE(), INTERVAL 7 DAY) WHERE `id` = ?');
            $updProto->execute([$remarks, $protocolId]);

            addTrailLog(
                $pdo,
                $protocolId,
                (int)$user['id'],
                'Deficiency Notice',
                $summaryLogText
            );

            createNotification(
                $pdo,
                $piId,
                $protocolId,
                'Intake Clarification Required',
                "Secretariat requested corrections on Protocol {$protocolCode}. " . (!empty($updatedDocTitles) ? "Forms needing attention: " . implode(', ', $updatedDocTitles) . ". " : "") . $remarks,
                'revision',
                'Provide Clarification'
            );

            $pdo->commit();

            $fresh = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $fresh->execute([$protocolId]);
            $updatedProto = $fresh->fetch();

            sendJson([
                'success'  => true,
                'message'  => 'Deficiency notice sent to researcher.',
                'protocol' => formatProtocolForSecretariat($pdo, $updatedProto),
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    case 'pass-intake':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);
        $remarks = trim((string)($body['remarks'] ?? 'All required intake documents verified complete.'));

        if ($protocolId <= 0) {
            sendError('Protocol ID is required.', 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
        $stmt->execute([$protocolId]);
        $proto = $stmt->fetch();
        if (!$proto) {
            sendError('Protocol not found.', 404);
        }

        $protocolCode = $proto['protocol_code'] ?: "URERB-{$protocolId}";
        $piId = (int)$proto['primary_investigator_id'];

        // Verify that all mandatory documents were uploaded by the researcher
        $missingCheck = $pdo->prepare("SELECT COUNT(*) FROM `protocol_documents` WHERE `protocol_id` = ? AND `is_required` = 1 AND (`file_path` IS NULL OR `file_path` = '')");
        $missingCheck->execute([$protocolId]);
        $missingUploadedCount = (int)$missingCheck->fetchColumn();

        if ($missingUploadedCount > 0) {
            sendError("Cannot pass intake: {$missingUploadedCount} mandatory document(s) have not been uploaded by the researcher.", 400);
        }

        $pdo->beginTransaction();
        try {
            // Update all uploaded documents for this protocol to Verified and clear any deficiency issue text
            $updAllDocs = $pdo->prepare("UPDATE `protocol_documents` SET `status` = 'Verified', `issue_text` = NULL WHERE `protocol_id` = ? AND (`file_path` IS NOT NULL AND `file_path` != '')");
            $updAllDocs->execute([$protocolId]);

            $upd = $pdo->prepare('UPDATE `protocols` SET `status` = "Passed Intake", `status_category` = "checking", `stage_label` = "2. Secretariat Intake Cleared", `active_step` = 2, `remarks` = ? WHERE `id` = ?');
            $upd->execute([$remarks, $protocolId]);

            addTrailLog(
                $pdo,
                $protocolId,
                (int)$user['id'],
                'Intake Passed',
                "Intake completeness verification passed by {$user['full_name']} (Desk {$user['desk']}). Ready for Reviewer Panel routing."
            );

            createNotification(
                $pdo,
                $piId,
                $protocolId,
                'Intake Verification Passed',
                "Your protocol {$protocolCode} passed completeness verification and has been queued for Reviewer Panel assignment.",
                'clearance',
                'Track Status'
            );

            $pdo->commit();

            $fresh = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $fresh->execute([$protocolId]);
            $updatedProto = $fresh->fetch();

            sendJson([
                'success'  => true,
                'message'  => 'Protocol successfully passed intake verification.',
                'protocol' => formatProtocolForSecretariat($pdo, $updatedProto),
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    default:
        sendError('Invalid intake checking action.', 404);
}


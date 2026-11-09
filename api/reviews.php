<?php
// ============================================================================
// MMSU URERB Portal — Reviewer Evaluation Endpoints
// ============================================================================

declare(strict_types=1);

require_once __DIR__ . '/helpers/bootstrap.php';

$user = requireRole(['reviewer', 'admin']);
$pdo = getDbConnection();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'assigned':
        $stmt = $pdo->prepare("SELECT a.*, p.title, p.protocol_code, p.review_track, p.academic_unit, p.academic_unit_short, p.nature_study, p.status AS protocol_status, p.due_date AS protocol_due_date, p.created_at AS protocol_created_at, p.date_submitted FROM `review_assignments` a JOIN `protocols` p ON a.protocol_id = p.id WHERE a.reviewer_id = ? AND a.status NOT IN ('Recused', 'Completed') ORDER BY a.id DESC");
        $stmt->execute([(int)$user['id']]);
        $assignments = $stmt->fetchAll();

        $protocols = [];
        foreach ($assignments as $a) {
            $pStmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $pStmt->execute([(int)$a['protocol_id']]);
            $proto = $pStmt->fetch();

            $evalStmt = $pdo->prepare('SELECT * FROM `review_evaluations` WHERE `assignment_id` = ? LIMIT 1');
            $evalStmt->execute([(int)$a['id']]);
            $eval = $evalStmt->fetch() ?: null;

            if ($proto) {
                $protocols[] = formatProtocolForReviewer($pdo, $proto, $a, $eval);
            }
        }

        sendJson([
            'success'   => true,
            'protocols' => $protocols,
            'assigned'  => $protocols,
        ]);
        break;

    case 'history':
        $stmt = $pdo->prepare("SELECT e.*, p.title, p.protocol_code, p.review_track, p.academic_unit, p.academic_unit_short, p.academic_year, p.date_submitted, p.decision_date, p.status AS protocol_status, p.clearance_cert_no, p.clearance_validity, p.report_received, p.primary_investigator_id, p.created_at AS protocol_created_at FROM `review_evaluations` e JOIN `protocols` p ON e.protocol_id = p.id WHERE e.reviewer_id = ? AND e.is_submitted = 1 ORDER BY e.submitted_at DESC");
        $stmt->execute([(int)$user['id']]);
        $rows = $stmt->fetchAll();

        $reviews = [];
        foreach ($rows as $r) {
            $pStmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $pStmt->execute([(int)$r['protocol_id']]);
            $proto = $pStmt->fetch();

            if ($proto) {
                $reviews[] = formatArchiveRow($pdo, $proto, $r);
            }
        }

        sendJson([
            'success' => true,
            'reviews' => $reviews,
            'history' => $reviews,
        ]);
        break;

    case 'coi-certify':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $assignmentId = (int)($body['assignmentId'] ?? 0);
        $protocolId = (int)($body['protocolId'] ?? 0);

        if ($assignmentId <= 0 && $protocolId <= 0) {
            sendError('Assignment ID or Protocol ID is required.', 400);
        }

        if ($assignmentId > 0) {
            $stmt = $pdo->prepare('SELECT * FROM `review_assignments` WHERE `id` = ? AND `reviewer_id` = ? LIMIT 1');
            $stmt->execute([$assignmentId, (int)$user['id']]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM `review_assignments` WHERE `protocol_id` = ? AND `reviewer_id` = ? AND `status` != "Recused" LIMIT 1');
            $stmt->execute([$protocolId, (int)$user['id']]);
        }
        $assign = $stmt->fetch();

        if (!$assign) {
            sendError('Review assignment not found.', 404);
        }

        $assignId = (int)$assign['id'];
        $protoId = (int)$assign['protocol_id'];

        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE `review_assignments` SET `coi_certified` = 1, `coi_certified_at` = NOW(), `status` = "Draft Saved" WHERE `id` = ?')->execute([$assignId]);

            $pdo->prepare('UPDATE `protocols` SET `status` = "Under Review", `status_category` = "assigned", `stage_label` = "3. Reviewer Evaluation In Progress" WHERE `id` = ?')->execute([$protoId]);

            addTrailLog(
                $pdo,
                $protoId,
                (int)$user['id'],
                'Panel Note',
                "Reviewer {$user['full_name']} certified Conflict of Interest and Confidentiality declarations."
            );

            $pdo->commit();

            sendJson([
                'success' => true,
                'message' => 'Conflict of Interest certified successfully. Review workspace unlocked.',
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    case 'coi-recuse':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $assignmentId = (int)($body['assignmentId'] ?? 0);
        $protocolId = (int)($body['protocolId'] ?? 0);
        $reason = trim((string)($body['reason'] ?? 'Potential Conflict of Interest declared.'));

        if ($assignmentId <= 0 && $protocolId <= 0) {
            sendError('Assignment ID or Protocol ID is required.', 400);
        }

        if ($assignmentId > 0) {
            $stmt = $pdo->prepare('SELECT * FROM `review_assignments` WHERE `id` = ? AND `reviewer_id` = ? LIMIT 1');
            $stmt->execute([$assignmentId, (int)$user['id']]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM `review_assignments` WHERE `protocol_id` = ? AND `reviewer_id` = ? LIMIT 1');
            $stmt->execute([$protocolId, (int)$user['id']]);
        }
        $assign = $stmt->fetch();

        if (!$assign) {
            sendError('Review assignment not found.', 404);
        }

        $assignId = (int)$assign['id'];
        $protoId = (int)$assign['protocol_id'];

        $pStmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
        $pStmt->execute([$protoId]);
        $proto = $pStmt->fetch();
        $protoCode = $proto['protocol_code'] ?: "URERB-{$protoId}";

        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE `review_assignments` SET `status` = "Recused" WHERE `id` = ?')->execute([$assignId]);

            // Check if any other non-recused assignment exists
            $otherStmt = $pdo->prepare('SELECT COUNT(*) FROM `review_assignments` WHERE `protocol_id` = ? AND `status` != "Recused"');
            $otherStmt->execute([$protoId]);
            $activeCount = (int)$otherStmt->fetchColumn();

            if ($activeCount === 0) {
                $pdo->prepare('UPDATE `protocols` SET `status` = "Passed Intake", `status_category` = "checking", `stage_label` = "2. Reviewer Recused (Re-routing Needed)" WHERE `id` = ?')->execute([$protoId]);
            }

            addTrailLog(
                $pdo,
                $protoId,
                (int)$user['id'],
                'Panel Note',
                "Reviewer {$user['full_name']} recused from evaluating Protocol {$protoCode}: {$reason}"
            );

            notifyRoleUsers(
                $pdo,
                'secretariat',
                $protoId,
                'Reviewer Recusal Notice',
                "Reviewer {$user['full_name']} recused themselves from Protocol {$protoCode}. Re-assignment to alternate panelist required.",
                'revision',
                'Deliberation Queue'
            );

            $pdo->commit();

            sendJson([
                'success' => true,
                'message' => 'Recusal recorded. Protocol returned to Secretariat for re-assignment.',
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    case 'save-draft':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);
        $assignmentId = (int)($body['assignmentId'] ?? 0);

        if ($protocolId <= 0 && $assignmentId <= 0) {
            sendError('Protocol ID or Assignment ID required.', 400);
        }

        if ($assignmentId <= 0) {
            $stmt = $pdo->prepare('SELECT `id` FROM `review_assignments` WHERE `protocol_id` = ? AND `reviewer_id` = ? AND `status` != "Recused" LIMIT 1');
            $stmt->execute([$protocolId, (int)$user['id']]);
            $assignmentId = (int)$stmt->fetchColumn();
        }

        if ($assignmentId <= 0) {
            sendError('Active review assignment not found.', 404);
        }

        $assignStmt = $pdo->prepare('SELECT * FROM `review_assignments` WHERE `id` = ? AND `reviewer_id` = ? LIMIT 1');
        $assignStmt->execute([$assignmentId, (int)$user['id']]);
        $assign = $assignStmt->fetch();
        if (!$assign) {
            sendError('Assignment not found.', 404);
        }

        $protoId = (int)$assign['protocol_id'];
        $actionRec = trim((string)($body['recommendedAction'] ?? ''));
        $comments = trim((string)($body['overallComments'] ?? ''));
        $justification = trim((string)($body['justification'] ?? ''));
        $additional = trim((string)($body['additionalNotes'] ?? ''));

        $pdo->beginTransaction();
        try {
            // Check existing evaluation draft
            $checkEval = $pdo->prepare('SELECT `id` FROM `review_evaluations` WHERE `assignment_id` = ? LIMIT 1');
            $checkEval->execute([$assignmentId]);
            $evalId = (int)$checkEval->fetchColumn();

            if ($evalId > 0) {
                $updEval = $pdo->prepare('UPDATE `review_evaluations` SET `recommended_action` = IF(? != "", ?, `recommended_action`), `overall_comments` = ?, `justification` = ?, `additional_notes` = ? WHERE `id` = ?');
                $updEval->execute([$actionRec, $actionRec ?: null, $comments, $justification, $additional, $evalId]);
            } else {
                $insEval = $pdo->prepare('INSERT INTO `review_evaluations` (`assignment_id`, `protocol_id`, `reviewer_id`, `recommended_action`, `overall_comments`, `justification`, `additional_notes`, `is_submitted`) VALUES (?, ?, ?, ?, ?, ?, ?, 0)');
                $insEval->execute([$assignmentId, $protoId, (int)$user['id'], $actionRec ?: null, $comments, $justification, $additional]);
                $evalId = (int)$pdo->lastInsertId();
            }

            // Sync findings
            $pdo->prepare('DELETE FROM `review_findings` WHERE `evaluation_id` = ?')->execute([$evalId]);
            $findings = is_array($body['findings'] ?? null) ? $body['findings'] : [];
            $insFind = $pdo->prepare('INSERT INTO `review_findings` (`evaluation_id`, `protocol_id`, `page_number`, `section_code`, `content`) VALUES (?, ?, ?, ?, ?)');
            foreach ($findings as $f) {
                $text = trim((string)($f['content'] ?? $f['text'] ?? ''));
                if ($text !== '') {
                    $insFind->execute([
                        $evalId,
                        $protoId,
                        max(1, (int)($f['page'] ?? 1)),
                        trim((string)($f['section'] ?? 'Protocol Evaluation')),
                        $text,
                    ]);
                }
            }

            $pdo->prepare('UPDATE `review_assignments` SET `status` = "Draft Saved" WHERE `id` = ?')->execute([$assignmentId]);

            $pdo->commit();

            sendJson([
                'success' => true,
                'message' => 'Review draft and findings saved.',
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    case 'submit':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);
        $assignmentId = (int)($body['assignmentId'] ?? 0);

        if ($assignmentId <= 0 && $protocolId <= 0) {
            sendError('Protocol ID or Assignment ID required.', 400);
        }

        if ($assignmentId <= 0) {
            $stmt = $pdo->prepare('SELECT `id` FROM `review_assignments` WHERE `protocol_id` = ? AND `reviewer_id` = ? AND `status` != "Recused" LIMIT 1');
            $stmt->execute([$protocolId, (int)$user['id']]);
            $assignmentId = (int)$stmt->fetchColumn();
        }

        $assignStmt = $pdo->prepare('SELECT * FROM `review_assignments` WHERE `id` = ? AND `reviewer_id` = ? LIMIT 1');
        $assignStmt->execute([$assignmentId, (int)$user['id']]);
        $assign = $assignStmt->fetch();
        if (!$assign) {
            sendError('Active review assignment not found.', 404);
        }

        $protoId = (int)$assign['protocol_id'];
        $pStmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
        $pStmt->execute([$protoId]);
        $proto = $pStmt->fetch();
        $protoCode = $proto['protocol_code'] ?: "URERB-{$protoId}";
        $piId = (int)$proto['primary_investigator_id'];

        $recommendedAction = trim((string)($body['recommendedAction'] ?? ''));
        $validActions = ['Approved', 'Minor Revisions', 'Major Revisions', 'Disapproved'];
        if (!in_array($recommendedAction, $validActions, true)) {
            sendError('Please select a valid recommendation (Approved, Minor Revisions, Major Revisions, Disapproved).', 400);
        }

        $comments = trim((string)($body['overallComments'] ?? ''));
        $justification = trim((string)($body['justification'] ?? ''));
        $additional = trim((string)($body['additionalNotes'] ?? ''));

        if ($recommendedAction !== 'Approved' && $justification === '' && $comments === '') {
            sendError('Justification remarks are required for revision or disapproval recommendations.', 400);
        }

        // Decision type mapping
        $decisionType = 'approved';
        if (in_array($recommendedAction, ['Minor Revisions', 'Major Revisions'], true)) {
            $decisionType = 'revision';
        } elseif ($recommendedAction === 'Disapproved') {
            $decisionType = 'disapproved';
        }

        $pdo->beginTransaction();
        try {
            // Upsert review_evaluations
            $checkEval = $pdo->prepare('SELECT `id` FROM `review_evaluations` WHERE `assignment_id` = ? LIMIT 1');
            $checkEval->execute([$assignmentId]);
            $evalId = (int)$checkEval->fetchColumn();

            if ($evalId > 0) {
                $updEval = $pdo->prepare('UPDATE `review_evaluations` SET `recommended_action` = ?, `decision_type` = ?, `overall_comments` = ?, `justification` = ?, `additional_notes` = ?, `is_submitted` = 1, `submitted_at` = NOW() WHERE `id` = ?');
                $updEval->execute([$recommendedAction, $decisionType, $comments, $justification, $additional, $evalId]);
            } else {
                $insEval = $pdo->prepare('INSERT INTO `review_evaluations` (`assignment_id`, `protocol_id`, `reviewer_id`, `recommended_action`, `decision_type`, `overall_comments`, `justification`, `additional_notes`, `is_submitted`, `submitted_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())');
                $insEval->execute([$assignmentId, $protoId, (int)$user['id'], $recommendedAction, $decisionType, $comments, $justification, $additional]);
                $evalId = (int)$pdo->lastInsertId();
            }

            // Sync findings
            $pdo->prepare('DELETE FROM `review_findings` WHERE `evaluation_id` = ?')->execute([$evalId]);
            $findings = is_array($body['findings'] ?? null) ? $body['findings'] : [];
            $insFind = $pdo->prepare('INSERT INTO `review_findings` (`evaluation_id`, `protocol_id`, `page_number`, `section_code`, `content`) VALUES (?, ?, ?, ?, ?)');
            foreach ($findings as $f) {
                $text = trim((string)($f['content'] ?? $f['text'] ?? ''));
                if ($text !== '') {
                    $insFind->execute([
                        $evalId,
                        $protoId,
                        max(1, (int)($f['page'] ?? 1)),
                        trim((string)($f['section'] ?? 'Protocol Evaluation')),
                        $text,
                    ]);
                }
            }

            // Update review_assignments status
            $pdo->prepare('UPDATE `review_assignments` SET `status` = "Submitted" WHERE `id` = ?')->execute([$assignmentId]);

            // Update protocol workflow according to recommendation
            if ($decisionType === 'approved') {
                $pdo->prepare('UPDATE `protocols` SET `status` = "Ready for Clearance", `status_category` = "assigned", `stage_label` = "4. Recommended for Clearance", `active_step` = 4 WHERE `id` = ?')->execute([$protoId]);

                addTrailLog(
                    $pdo,
                    $protoId,
                    (int)$user['id'],
                    'Endorsed',
                    "Reviewer {$user['full_name']} concluded ethics evaluation with recommendation: {$recommendedAction}. Protocol is ready for Ethics Clearance certificate issuance."
                );

                notifyRoleUsers(
                    $pdo,
                    'secretariat',
                    $protoId,
                    'Review Completed — Ready for Clearance',
                    "Reviewer {$user['full_name']} submitted approval recommendation for Protocol {$protoCode}. Clearance certificate may now be prepared.",
                    'clearance',
                    'Issue Clearance'
                );
            } elseif ($decisionType === 'revision') {
                $pdo->prepare('UPDATE `protocols` SET `status` = "Revision Required", `status_category` = "assigned", `stage_label` = "4. Revisions Required by Reviewer", `active_step` = 4, `remarks` = ?, `due_date` = DATE_ADD(CURDATE(), INTERVAL 14 DAY) WHERE `id` = ?')->execute([$justification ?: $comments, $protoId]);

                addTrailLog(
                    $pdo,
                    $protoId,
                    (int)$user['id'],
                    'Deficiency Notice',
                    "Reviewer {$user['full_name']} recommended {$recommendedAction}: " . ($justification ?: $comments)
                );

                createNotification(
                    $pdo,
                    $piId,
                    $protoId,
                    'Ethical / Technical Revisions Required',
                    "The Reviewer Panel has requested revisions on Protocol {$protoCode}: " . ($justification ?: $comments),
                    'revision',
                    'View & Revise'
                );

                notifyRoleUsers(
                    $pdo,
                    'secretariat',
                    $protoId,
                    'Revisions Recommended by Reviewer',
                    "Reviewer {$user['full_name']} recommended {$recommendedAction} for Protocol {$protoCode}.",
                    'revision',
                    'Deliberation Queue'
                );
            } else {
                // Disapproved
                $pdo->prepare('UPDATE `protocols` SET `status` = "Disapproved", `status_category` = "completed", `stage_label` = "4. Disapproved", `active_step` = 4, `decision_date` = CURDATE(), `remarks` = ? WHERE `id` = ?')->execute([$justification ?: $comments, $protoId]);

                addTrailLog(
                    $pdo,
                    $protoId,
                    (int)$user['id'],
                    'Panel Note',
                    "Reviewer recommended disapproval for Protocol {$protoCode}: " . ($justification ?: $comments)
                );

                createNotification(
                    $pdo,
                    $piId,
                    $protoId,
                    'Protocol Evaluation Disposition: Disapproved',
                    "URERB Review Panel has concluded deliberation for Protocol {$protoCode} with Disapproval. Check remarks for details.",
                    'revision',
                    'Track Protocol'
                );

                notifyRoleUsers(
                    $pdo,
                    'secretariat',
                    $protoId,
                    'Protocol Disapproval Recorded',
                    "Protocol {$protoCode} was marked Disapproved by Reviewer {$user['full_name']}.",
                    'update',
                    'Archives'
                );
            }

            $pdo->commit();

            $nowFormatted = date('M d, Y h:i A');

            sendJson([
                'success'           => true,
                'message'           => 'Review submitted successfully.',
                'recommendedAction' => $recommendedAction,
                'submittedDate'     => $nowFormatted,
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    default:
        sendError('Invalid reviews action.', 404);
}


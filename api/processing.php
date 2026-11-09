<?php
// ============================================================================
// MMSU URERB Portal — Secretariat Application Processing Endpoints
// ============================================================================

declare(strict_types=1);

require_once __DIR__ . '/helpers/bootstrap.php';

$user = requireRole(['secretariat', 'admin']);
$pdo = getDbConnection();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'reviewers':
        $stmt = $pdo->query("SELECT `id`, `full_name` AS `name`, `email`, `panel`, `title`, `department`, `college` FROM `users` WHERE `role` = 'reviewer' AND `status` = 'Active Reviewer' ORDER BY `full_name` ASC");
        $reviewers = $stmt->fetchAll();

        sendJson([
            'success'   => true,
            'reviewers' => $reviewers,
        ]);
        break;

    case 'get':
        $identifier = trim((string)($_GET['id'] ?? ''));
        if ($identifier === '') {
            sendError('Protocol identifier is required.', 400);
        }

        if (ctype_digit($identifier)) {
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

        sendJson([
            'success'  => true,
            'protocol' => formatProtocolForSecretariat($pdo, $proto),
        ]);
        break;

    case 'assign-reviewer':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);
        $reviewerId = (int)($body['reviewerId'] ?? 0);
        $panelName = trim((string)($body['panelName'] ?? ''));
        $docketMeeting = trim((string)($body['docketMeeting'] ?? 'Upcoming Regular Panel Session'));
        $docketTime = trim((string)($body['docketTime'] ?? '09:00 AM PST'));
        $windowDays = max(7, min(30, (int)($body['windowDays'] ?? 14)));

        if ($protocolId <= 0 || $reviewerId <= 0) {
            sendError('Protocol ID and Reviewer ID are required.', 400);
        }

        // Fetch protocol
        $stmt = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
        $stmt->execute([$protocolId]);
        $proto = $stmt->fetch();
        if (!$proto) {
            sendError('Protocol not found.', 404);
        }

        // Fetch reviewer
        $revStmt = $pdo->prepare("SELECT * FROM `users` WHERE `id` = ? AND `role` = 'reviewer' LIMIT 1");
        $revStmt->execute([$reviewerId]);
        $reviewer = $revStmt->fetch();
        if (!$reviewer) {
            sendError('Selected reviewer account not found.', 404);
        }

        $panel = $panelName ?: ($reviewer['panel'] ?: 'Panel A — Clinical, Health & Biomedical Sciences');
        $protocolCode = $proto['protocol_code'] ?: "URERB-{$protocolId}";
        $piId = (int)$proto['primary_investigator_id'];

        $pdo->beginTransaction();
        try {
            // Check existing assignment
            $checkAssign = $pdo->prepare('SELECT `id` FROM `review_assignments` WHERE `protocol_id` = ? AND `reviewer_id` = ? LIMIT 1');
            $checkAssign->execute([$protocolId, $reviewerId]);
            $existingAssignId = $checkAssign->fetchColumn();

            if ($existingAssignId) {
                $updAssign = $pdo->prepare('UPDATE `review_assignments` SET `assigned_by` = ?, `panel_name` = ?, `docket_meeting` = ?, `docket_time` = ?, `window_days` = ?, `due_date` = DATE_ADD(CURDATE(), INTERVAL ? DAY), `status` = "Pending", `coi_certified` = 0 WHERE `id` = ?');
                $updAssign->execute([
                    (int)$user['id'],
                    $panel,
                    $docketMeeting,
                    $docketTime,
                    $windowDays,
                    $windowDays,
                    $existingAssignId,
                ]);
            } else {
                $insAssign = $pdo->prepare('INSERT INTO `review_assignments` (`protocol_id`, `reviewer_id`, `assigned_by`, `panel_name`, `docket_meeting`, `docket_time`, `window_days`, `due_date`, `status`, `coi_certified`) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), "Pending", 0)');
                $insAssign->execute([
                    $protocolId,
                    $reviewerId,
                    (int)$user['id'],
                    $panel,
                    $docketMeeting,
                    $docketTime,
                    $windowDays,
                    $windowDays,
                ]);
            }

            // Update protocol status
            $updProto = $pdo->prepare('UPDATE `protocols` SET `status` = "Assigned to Reviewers", `status_category` = "assigned", `stage_label` = "3. Panel Deliberation", `active_step` = 3, `due_date` = DATE_ADD(CURDATE(), INTERVAL ? DAY) WHERE `id` = ?');
            $updProto->execute([$windowDays, $protocolId]);

            // Trail log
            addTrailLog(
                $pdo,
                $protocolId,
                (int)$user['id'],
                'Panel Assignment',
                "Assigned to scientific reviewer {$reviewer['full_name']} ({$panel}) with a {$windowDays}-day review window. Scheduled for {$docketMeeting}."
            );

            // Notify Reviewer
            createNotification(
                $pdo,
                $reviewerId,
                $protocolId,
                'New Protocol Review Assignment',
                "Protocol {$protocolCode} has been routed to you for ethics evaluation. Please complete COI certification within {$windowDays} calendar days.",
                'assignment',
                'Open Review'
            );

            // Notify Researcher
            createNotification(
                $pdo,
                $piId,
                $protocolId,
                'Protocol Routed to Reviewer Panel',
                "Your protocol {$protocolCode} has been endorsed to {$panel} for primary ethics review.",
                'update',
                'Track Status'
            );

            $pdo->commit();

            $fresh = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $fresh->execute([$protocolId]);
            $updatedProto = $fresh->fetch();

            sendJson([
                'success'  => true,
                'message'  => "Assigned to {$reviewer['full_name']} successfully.",
                'protocol' => formatProtocolForSecretariat($pdo, $updatedProto),
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    case 'update-status':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);
        $newStatus = trim((string)($body['status'] ?? ''));
        $stageLabel = trim((string)($body['stageLabel'] ?? $newStatus));
        $remarks = trim((string)($body['remarks'] ?? ''));

        if ($protocolId <= 0 || $newStatus === '') {
            sendError('Protocol ID and new status are required.', 400);
        }

        $validStatuses = [
            'Passed Intake',
            'Assigned to Reviewers',
            'Under Review',
            'Revision Required',
            'Ready for Clearance',
            'Clearance Issued',
            'Completed',
            'Archived',
            'Disapproved',
        ];

        if (!in_array($newStatus, $validStatuses, true)) {
            sendError('Invalid protocol status provided.', 400);
        }

        $statusCategory = 'assigned';
        if (in_array($newStatus, ['Clearance Issued', 'Completed', 'Archived', 'Disapproved'], true)) {
            $statusCategory = 'completed';
        }

        $activeStep = 3;
        if ($newStatus === 'Ready for Clearance') $activeStep = 4;
        if (in_array($newStatus, ['Clearance Issued', 'Completed'], true)) $activeStep = 5;

        $stmt = $pdo->prepare('UPDATE `protocols` SET `status` = ?, `status_category` = ?, `stage_label` = ?, `active_step` = ?, `remarks` = IF(? != "", ?, `remarks`) WHERE `id` = ?');
        $stmt->execute([$newStatus, $statusCategory, $stageLabel, $activeStep, $remarks, $remarks, $protocolId]);

        addTrailLog($pdo, $protocolId, (int)$user['id'], 'Panel Note', "Protocol status manually updated to '{$newStatus}' by Secretariat.");

        $fresh = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
        $fresh->execute([$protocolId]);
        $updated = $fresh->fetch();

        sendJson([
            'success'  => true,
            'message'  => "Protocol status updated to {$newStatus}.",
            'protocol' => formatProtocolForSecretariat($pdo, $updated),
        ]);
        break;

    case 'update-docket':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);
        $meeting = trim((string)($body['docketMeeting'] ?? ''));
        $time = trim((string)($body['docketTime'] ?? ''));

        if ($protocolId <= 0) {
            sendError('Protocol ID is required.', 400);
        }

        $upd = $pdo->prepare('UPDATE `review_assignments` SET `docket_meeting` = ?, `docket_time` = ? WHERE `protocol_id` = ? AND `status` != "Recused"');
        $upd->execute([$meeting, $time, $protocolId]);

        addTrailLog($pdo, $protocolId, (int)$user['id'], 'Panel Note', "Docket schedule updated: {$meeting} ({$time}).");

        $fresh = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
        $fresh->execute([$protocolId]);
        $updated = $fresh->fetch();

        sendJson([
            'success'  => true,
            'message'  => 'Docket meeting schedule updated.',
            'protocol' => formatProtocolForSecretariat($pdo, $updated),
        ]);
        break;

    case 'add-note':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);
        $badge = trim((string)($body['badge'] ?? 'Panel Note'));
        $text = trim((string)($body['noteText'] ?? ''));

        if ($protocolId <= 0 || $text === '') {
            sendError('Protocol ID and note content are required.', 400);
        }

        $validBadges = ['Submission', 'Intake Passed', 'Deficiency Notice', 'Panel Assignment', 'Panel Note', 'Endorsed', 'Revision Sent', 'Clearance'];
        if (!in_array($badge, $validBadges, true)) {
            $badge = 'Panel Note';
        }

        addTrailLog($pdo, $protocolId, (int)$user['id'], $badge, $text);

        $fresh = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
        $fresh->execute([$protocolId]);
        $updated = $fresh->fetch();

        sendJson([
            'success'  => true,
            'message'  => 'Audit log entry added.',
            'protocol' => formatProtocolForSecretariat($pdo, $updated),
        ]);
        break;

    case 'issue-clearance':
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

        $protocolCode = $proto['protocol_code'] ?: "URERB-{$protocolId}";
        $piId = (int)$proto['primary_investigator_id'];

        $pdo->beginTransaction();
        try {
            $year = date('Y');
            // Generate official clearance certificate number MMSU-REC-YYYY-NNN
            $certNo = trim((string)($body['clearanceCertNo'] ?? ''));
            if ($certNo === '') {
                $certPrefix = "MMSU-REC-{$year}-";
                $seqStmt = $pdo->prepare("SELECT MAX(CAST(SUBSTRING_INDEX(clearance_cert_no, '-', -1) AS UNSIGNED)) FROM `protocols` WHERE `clearance_cert_no` LIKE ?");
                $seqStmt->execute(["{$certPrefix}%"]);
                $maxCert = (int)$seqStmt->fetchColumn();
                $certNo = sprintf('%s%03d', $certPrefix, $maxCert + 1);
            }

            // Validity: 1 full year from issuance
            $startDate = date('F d, Y');
            $endDate = date('F d, Y', strtotime('+1 year'));
            $validity = "{$startDate} – {$endDate}";

            $updProto = $pdo->prepare('UPDATE `protocols` SET `status` = "Completed", `status_category` = "completed", `stage_label` = "5. Clearance Issued", `active_step` = 5, `clearance_cert_no` = ?, `clearance_validity` = ?, `decision_date` = CURDATE() WHERE `id` = ?');
            $updProto->execute([$certNo, $validity, $protocolId]);

            // Complete assignment
            $pdo->prepare('UPDATE `review_assignments` SET `status` = "Completed" WHERE `protocol_id` = ? AND `status` != "Recused"')->execute([$protocolId]);

            addTrailLog(
                $pdo,
                $protocolId,
                (int)$user['id'],
                'Clearance',
                "Formal Ethics Clearance Certificate {$certNo} officially issued by URERB Chair & Secretariat (Validity: {$validity})."
            );

            createNotification(
                $pdo,
                $piId,
                $protocolId,
                'Ethics Clearance Issued!',
                "Congratulations! URERB has issued formal Ethics Clearance {$certNo} for Protocol {$protocolCode}. Valid until {$endDate}.",
                'clearance',
                'View Clearance Cert'
            );

            $pdo->commit();

            $fresh = $pdo->prepare('SELECT * FROM `protocols` WHERE `id` = ? LIMIT 1');
            $fresh->execute([$protocolId]);
            $updated = $fresh->fetch();

            sendJson([
                'success'           => true,
                'message'           => "Ethics Clearance {$certNo} successfully issued.",
                'clearanceCertNo'   => $certNo,
                'clearanceValidity' => $validity,
                'protocol'          => formatProtocolForSecretariat($pdo, $updated),
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendError($e->getMessage(), 500);
        }
        break;

    default:
        sendError('Invalid processing action.', 404);
}


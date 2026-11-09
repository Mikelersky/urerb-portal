<?php
// ============================================================================
// MMSU URERB Portal — Secretariat Records & Archives Endpoints
// ============================================================================

declare(strict_types=1);

require_once __DIR__ . '/helpers/bootstrap.php';

$user = requireRole(['secretariat', 'admin']);
$pdo = getDbConnection();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'list':
        // Retrieve protocols: include all submitted protocols (deliberation, active clearances, completed, archived)
        $stmt = $pdo->query("SELECT * FROM `protocols` WHERE `status` != 'Draft' ORDER BY `id` DESC");
        $rows = $stmt->fetchAll();

        $archives = [];
        foreach ($rows as $r) {
            $archives[] = formatArchiveRow($pdo, $r);
        }

        sendJson([
            'success'  => true,
            'archives' => $archives,
            'records'  => $archives,
            'metrics'  => getSecretariatMetrics($pdo),
        ]);
        break;

    case 'toggle-report':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $protocolId = (int)($body['protocolId'] ?? 0);

        if ($protocolId <= 0) {
            sendError('Protocol ID is required.', 400);
        }

        $stmt = $pdo->prepare('SELECT `report_received` FROM `protocols` WHERE `id` = ? LIMIT 1');
        $stmt->execute([$protocolId]);
        $curr = $stmt->fetchColumn();

        if ($curr === false) {
            sendError('Protocol not found.', 404);
        }

        $newVal = $curr ? 0 : 1;
        $upd = $pdo->prepare('UPDATE `protocols` SET `report_received` = ? WHERE `id` = ?');
        $upd->execute([$newVal, $protocolId]);

        addTrailLog(
            $pdo,
            $protocolId,
            (int)$user['id'],
            'Panel Note',
            $newVal ? 'Post-clearance Progress / Final Report marked as Received.' : 'Post-clearance report requirement status reverted to Pending.'
        );

        sendJson([
            'success'        => true,
            'reportReceived' => (bool)$newVal,
            'message'        => $newVal ? 'Post-clearance report marked as received.' : 'Report status set to pending.',
        ]);
        break;

    default:
        sendError('Invalid archives action.', 404);
}


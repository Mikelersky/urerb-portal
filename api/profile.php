<?php
// ============================================================================
// MMSU URERB Portal — User Profile Management Endpoints
// ============================================================================

declare(strict_types=1);

require_once __DIR__ . '/helpers/bootstrap.php';

$user = requireAuth();
$pdo = getDbConnection();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'update-contact':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $contactNumber = trim((string)($body['contactNumber'] ?? ''));
        $office = trim((string)($body['office'] ?? ''));

        $stmt = $pdo->prepare('UPDATE `users` SET `contact_number` = ?, `office` = ? WHERE `id` = ?');
        $stmt->execute([$contactNumber, $office, (int)$user['id']]);

        $refresh = $pdo->prepare('SELECT * FROM `users` WHERE `id` = ? LIMIT 1');
        $refresh->execute([(int)$user['id']]);
        $updatedUser = $refresh->fetch();

        sendJson([
            'success' => true,
            'message' => 'Contact information updated successfully.',
            'user'    => formatUserRow($updatedUser),
        ]);
        break;

    case 'change-password':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $oldPassword = (string)($body['oldPassword'] ?? '');
        $newPassword = (string)($body['newPassword'] ?? '');
        $confirmPassword = (string)($body['confirmPassword'] ?? '');

        if ($oldPassword === '' || $newPassword === '') {
            sendError('Current password and new password are required.', 400);
        }

        if (!password_verify($oldPassword, $user['password_hash'])) {
            sendError('Current password is incorrect.', 400);
        }

        if (strlen($newPassword) < 6) {
            sendError('New password must be at least 6 characters long.', 400);
        }

        if ($confirmPassword !== '' && $newPassword !== $confirmPassword) {
            sendError('New passwords do not match.', 400);
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('UPDATE `users` SET `password_hash` = ? WHERE `id` = ?');
        $stmt->execute([$newHash, (int)$user['id']]);

        sendJson([
            'success' => true,
            'message' => 'Password changed successfully.',
        ]);
        break;

    default:
        sendError('Invalid profile action.', 404);
}


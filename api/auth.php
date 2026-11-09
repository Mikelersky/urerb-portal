<?php
// ============================================================================
// MMSU URERB Portal — Authentication Endpoints
// ============================================================================

declare(strict_types=1);

require_once __DIR__ . '/helpers/bootstrap.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

$pdo = getDbConnection();

switch ($action) {
    case 'login':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $identifier = trim((string)($body['identifier'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($identifier === '' || $password === '') {
            sendError('Please provide institutional email/username and password.', 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM `users` WHERE LOWER(`email`) = LOWER(?) OR LOWER(`username`) = LOWER(?) LIMIT 1');
        $stmt->execute([$identifier, $identifier]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            sendError('Invalid institutional email or password. Please check your credentials.', 401);
        }

        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['last_login'] = date('M d, Y h:i A');

        sendJson([
            'success' => true,
            'user'    => formatUserRow($user),
        ]);
        break;

    case 'register':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $fullName = trim((string)($body['fullName'] ?? ''));
        $category = trim((string)($body['category'] ?? 'faculty'));
        $academicUnit = trim((string)($body['academicUnit'] ?? ''));
        $email = trim(strtolower((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');
        $confirmPassword = (string)($body['confirmPassword'] ?? '');

        if ($fullName === '' || $email === '' || $password === '') {
            sendError('Full name, institutional email, and password are required.', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendError('Please provide a valid email address.', 400);
        }

        if (!str_ends_with($email, '@mmsu.edu.ph')) {
            sendError('Registration requires an official @mmsu.edu.ph institutional email address.', 400);
        }

        if (strlen($password) < 6) {
            sendError('Password must be at least 6 characters long.', 400);
        }

        if ($password !== $confirmPassword) {
            sendError('Passwords do not match.', 400);
        }

        // Check if email already registered
        $checkStmt = $pdo->prepare('SELECT `id` FROM `users` WHERE LOWER(`email`) = LOWER(?) LIMIT 1');
        $checkStmt->execute([$email]);
        if ($checkStmt->fetchColumn()) {
            sendError('An account with this institutional email already exists. Please log in.', 409);
        }

        // Generate username from email prefix
        $baseUsername = explode('@', $email)[0];
        $username = $baseUsername;
        $counter = 1;
        $userCheckStmt = $pdo->prepare('SELECT `id` FROM `users` WHERE LOWER(`username`) = LOWER(?) LIMIT 1');
        while (true) {
            $userCheckStmt->execute([$username]);
            if (!$userCheckStmt->fetchColumn()) {
                break;
            }
            $username = $baseUsername . $counter;
            $counter++;
        }

        // Generate unique researcher ID (MMSU-RES-YYYY-NNNN)
        $year = date('Y');
        $prefix = "MMSU-RES-{$year}-";
        $idStmt = $pdo->prepare("SELECT `id_number` FROM `users` WHERE `id_number` LIKE ? ORDER BY `id` DESC LIMIT 1");
        $idStmt->execute(["{$prefix}%"]);
        $lastIdNumber = $idStmt->fetchColumn();
        $nextSeq = 1;
        if ($lastIdNumber && preg_match('/(\d+)$/', $lastIdNumber, $matches)) {
            $nextSeq = ((int)$matches[1]) + 1;
        }
        $idNumber = sprintf('%s%04d', $prefix, $nextSeq);

        // Parse academic unit into college and department
        $college = $academicUnit;
        $department = '';
        if (str_contains($academicUnit, ' - ')) {
            $parts = explode(' - ', $academicUnit, 2);
            $college = trim($parts[0]);
            $department = trim($parts[1]);
        }

        // Generate initials
        $cleaned = trim(preg_replace('/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i', '', $fullName));
        $parts = preg_split('/\s+/', $cleaned);
        $initials = 'RS';
        if (count($parts) >= 2) {
            $initials = strtoupper(substr($parts[0], 0, 1) . substr(end($parts), 0, 1));
        } elseif (count($parts) === 1) {
            $initials = strtoupper(substr($parts[0], 0, 2));
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        $insertStmt = $pdo->prepare('INSERT INTO `users` (`email`, `username`, `password_hash`, `role`, `full_name`, `initials`, `title`, `id_number`, `category`, `college`, `department`, `status`, `is_verified`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $insertStmt->execute([
            $email,
            $username,
            $passwordHash,
            'researcher',
            $fullName,
            $initials,
            'Principal Investigator',
            $idNumber,
            $category,
            $college,
            $department,
            'Active Researcher',
            1,
        ]);

        $newUserId = (int)$pdo->lastInsertId();

        $_SESSION['user_id'] = $newUserId;
        $_SESSION['last_login'] = date('M d, Y h:i A');

        // Welcome notification
        createNotification(
            $pdo,
            $newUserId,
            null,
            'Welcome to MMSU URERB Portal',
            'Your institutional researcher account is active. You may now prepare and submit ethics review protocols.',
            'update',
            'Dashboard'
        );

        $fetchStmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = ? LIMIT 1');
        $fetchStmt->execute([$newUserId]);
        $newUser = $fetchStmt->fetch();

        sendJson([
            'success' => true,
            'user'    => formatUserRow($newUser),
        ]);
        break;

    case 'me':
        if (empty($_SESSION['user_id'])) {
            sendJson(['success' => false, 'user' => null], 401);
        }

        $stmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = ? LIMIT 1');
        $stmt->execute([(int)$_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            $_SESSION = [];
            session_destroy();
            sendJson(['success' => false, 'user' => null], 401);
        }

        sendJson([
            'success' => true,
            'user'    => formatUserRow($user),
        ]);
        break;

    case 'logout':
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }
        session_destroy();

        sendJson([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
        break;

    default:
        sendError('Invalid authentication action.', 404);
}


<?php
// ============================================================================
// MMSU URERB Portal — Bootstrap & API Helper Utilities
// ============================================================================

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

// Configure session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_samesite', 'Lax');
    session_name('URERB_SESSID');
    session_start();
}

// Handle CORS for local Vite dev server
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

if (in_array($origin, $allowedOrigins, true) || (preg_match('#^https?://([a-zA-Z0-9-]+\.trycloudflare\.com|localhost|127\.0\.0\.1)(:\d+)?$#', $origin) === 1)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Send JSON response and terminate script.
 */
function sendJson(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Send standard JSON error response and terminate.
 */
function sendError(string $message, int $status = 400, array $extra = []): void
{
    sendJson(array_merge([
        'success' => false,
        'message' => $message,
    ], $extra), $status);
}

/**
 * Parse JSON request body.
 */
function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Enforce authenticated session.
 */
function requireAuth(): array
{
    if (empty($_SESSION['user_id'])) {
        sendError('Authentication required. Please sign in.', 401);
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = ? LIMIT 1');
    $stmt->execute([(int)$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        $_SESSION = [];
        session_destroy();
        sendError('User account not found or session expired.', 401);
    }

    return $user;
}

/**
 * Enforce role authorization.
 */
function requireRole(array $allowedRoles): array
{
    $user = requireAuth();
    if (!in_array($user['role'], $allowedRoles, true)) {
        sendError('Access forbidden: insufficient role permissions.', 403);
    }
    return $user;
}

/**
 * Resolve uploads directory path.
 */
function getUploadsDir(): string
{
    $dir = realpath(__DIR__ . '/../uploads');
    if ($dir === false) {
        $dir = __DIR__ . '/../uploads';
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        $dir = realpath($dir) ?: $dir;
    }
    return $dir;
}

/**
 * Current academic year helper (Aug start).
 */
function getAcademicYear(): string
{
    $month = (int)date('n');
    $year = (int)date('Y');
    $startYear = $month >= 8 ? $year : $year - 1;
    return "AY {$startYear}-" . ($startYear + 1);
}

/**
 * Format user row for frontend consumption.
 */
function formatUserRow(array $user): array
{
    $initials = $user['initials'];
    if (empty($initials) && !empty($user['full_name'])) {
        $cleaned = trim(preg_replace('/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i', '', $user['full_name']));
        $parts = preg_split('/\s+/', $cleaned);
        if (count($parts) >= 2) {
            $initials = strtoupper(substr($parts[0], 0, 1) . substr(end($parts), 0, 1));
        } else {
            $initials = strtoupper(substr($parts[0] ?? 'US', 0, 2));
        }
    }

    $createdFormatted = !empty($user['created_at'])
        ? date('M d, Y', strtotime($user['created_at']))
        : '—';

    $lastLogin = $_SESSION['last_login'] ?? date('M d, Y h:i A');
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

    $panel = $user['panel'] ?? '';
    $panelFull = $panel ? "{$panel} — Scientific Review" : 'URERB Review Panel';

    return [
        'id'               => (int)$user['id'],
        'email'            => $user['email'],
        'username'         => $user['username'] ?? '',
        'name'             => $user['full_name'],
        'fullName'         => $user['full_name'],
        'initials'         => $initials ?: 'US',
        'title'            => $user['title'] ?? '',
        'role'             => $user['role'],
        'status'           => $user['status'],
        'isVerified'       => (bool)$user['is_verified'],
        'idNumber'         => $user['id_number'] ?? '',
        'researcherId'     => $user['id_number'] ?? '',
        'officerId'        => $user['id_number'] ?? '',
        'reviewerId'       => $user['id_number'] ?? '',
        'category'         => $user['category'] ?? 'faculty',
        'college'          => $user['college'] ?? '',
        'department'       => $user['department'] ?? '',
        'panel'            => $panel,
        'panelFull'        => $panelFull,
        'desk'             => $user['desk'] ?? '',
        'contactNumber'    => $user['contact_number'] ?? '',
        'office'           => $user['office'] ?? '',
        'userRole'         => $user['role'] === 'researcher' ? ($user['department'] ?: 'Principal Investigator') : ucfirst($user['role']),
        'specialization'   => $user['department'] ?: 'Research Ethics Protocol Evaluation',
        'appointmentDate'  => $createdFormatted,
        'accountCreated'   => $createdFormatted,
        'lastLogin'        => $lastLogin,
        'ip'               => $clientIp,
        'cycle'            => getAcademicYear(),
    ];
}

/**
 * Format document row for frontend UI.
 */
function formatDocumentRow(array $doc, ?string $protocolCode = null): array
{
    $status = $doc['status'];
    $statusType = 'missing';

    if ($status === 'Verified') {
        $statusType = 'verified';
    } elseif ($status === 'Deficient') {
        $statusType = 'revision';
    } elseif ($status === 'Uploaded' || $status === 'Submitted') {
        $statusType = 'uploaded';
    }

    $ext = 'PDF';
    if (!empty($doc['file_name'])) {
        $pathInfo = pathinfo($doc['file_name']);
        if (!empty($pathInfo['extension'])) {
            $ext = strtoupper($pathInfo['extension']);
        }
    }

    $fileUrl = !empty($doc['file_path']) ? "/urerb-api/file.php?id={$doc['id']}" : null;
    $downloadUrl = !empty($doc['file_path']) ? "/urerb-api/file.php?id={$doc['id']}&download=1" : null;

    return [
        'id'                => (int)$doc['id'],
        'protocolId'        => (int)$doc['protocol_id'],
        'key'               => $doc['document_key'],
        'documentKey'       => $doc['document_key'],
        'code'              => strtoupper($doc['document_key']),
        'title'             => $doc['title'],
        'name'              => $doc['file_name'] ?: $doc['title'],
        'fileName'          => $doc['file_name'] ?? '',
        'type'              => $ext,
        'size'              => $doc['file_size'] ?: '—',
        'fileSize'          => $doc['file_size'] ?: '—',
        'fileSizeFormatted' => $doc['file_size'] ?: '—',
        'version'           => $doc['version'] ?: 'v1.0',
        'isRequired'        => (bool)$doc['is_required'],
        'required'          => (bool)$doc['is_required'],
        'status'            => $status,
        'statusType'        => $statusType,
        'issueText'         => $doc['issue_text'] ?? '',
        'notes'             => $doc['issue_text'] ?? '',
        'uploadedAt'        => !empty($doc['uploaded_at']) ? date('M d, Y h:i A', strtotime($doc['uploaded_at'])) : null,
        'fileUrl'           => $fileUrl,
        'downloadUrl'       => $downloadUrl,
    ];
}

/**
 * Format protocol for Researcher views.
 */
function formatProtocolForResearcher(PDO $pdo, array $p): array
{
    $id = (int)$p['id'];
    $isDraft = ($p['status'] === 'Draft');

    // Documents
    $docStmt = $pdo->prepare('SELECT * FROM `protocol_documents` WHERE `protocol_id` = ? ORDER BY `id` ASC');
    $docStmt->execute([$id]);
    $rawDocs = $docStmt->fetchAll();
    $documents = [];
    foreach ($rawDocs as $d) {
        $documents[] = formatDocumentRow($d, $p['protocol_code']);
    }

    // Co-investigators
    $coStmt = $pdo->prepare('SELECT * FROM `protocol_co_investigators` WHERE `protocol_id` = ? ORDER BY `id` ASC');
    $coStmt->execute([$id]);
    $rawCo = $coStmt->fetchAll();
    $coInvestigators = [];
    foreach ($rawCo as $co) {
        $coInvestigators[] = [
            'id'          => (int)$co['id'],
            'name'        => $co['name'],
            'role'        => $co['role'],
            'affiliation' => $co['affiliation'] ?? '',
        ];
    }

    // Target populations
    $popStmt = $pdo->prepare('SELECT * FROM `protocol_target_populations` WHERE `protocol_id` = ?');
    $popStmt->execute([$id]);
    $targetPopRows = $popStmt->fetchAll();
    $targetPopulations = [];
    $otherTargetPop = '';
    foreach ($targetPopRows as $pop) {
        $targetPopulations[] = $pop['cohort_key'];
        if ($pop['cohort_key'] === 'other' && !empty($pop['custom_specification'])) {
            $otherTargetPop = $pop['custom_specification'];
        }
    }

    // Audit logs
    $logStmt = $pdo->prepare('SELECT l.*, u.full_name AS author_name FROM `investigator_trail_logs` l LEFT JOIN `users` u ON l.author_id = u.id WHERE l.protocol_id = ? ORDER BY l.created_at ASC');
    $logStmt->execute([$id]);
    $rawLogs = $logStmt->fetchAll();
    $logs = [];
    foreach ($rawLogs as $log) {
        $logs[] = [
            'id'        => (int)$log['id'],
            'badge'     => $log['badge'],
            'text'      => $log['log_text'],
            'author'    => $log['author_name'] ?? 'System',
            'createdAt' => date('M d, Y h:i A', strtotime($log['created_at'])),
        ];
    }

    $protocolId = $p['protocol_code'] ?: "DRAFT-{$id}";
    $dateFormatted = !empty($p['date_submitted'])
        ? date('M d, Y', strtotime($p['date_submitted']))
        : (!empty($p['created_at']) ? date('M d, Y', strtotime($p['created_at'])) : 'Draft');

    $reviewTrack = $p['review_track'];
    $reviewCategory = $reviewTrack;
    if ($reviewTrack === 'Expedited Review') {
        $reviewCategory = 'Expedited Review (Minimal Risk / Non-Invasive)';
    } elseif ($reviewTrack === 'Exempted Review') {
        $reviewCategory = 'Exempted Review (Negligible Risk)';
    } elseif ($reviewTrack === 'Full Board Review') {
        $reviewCategory = 'Full Board Review (More than Minimal Risk / Vulnerable Groups)';
    }

    $academicUnit = $p['academic_unit'] ?? '';
    $academicUnitShort = $p['academic_unit_short'];
    if (empty($academicUnitShort)) {
        if (preg_match('/\(([^)]+)\)/', $academicUnit, $matches)) {
            $academicUnitShort = $matches[1];
        } else {
            $academicUnitShort = 'MMSU';
        }
    }

    return [
        'id'                  => $id,
        'protocolId'          => $protocolId,
        'protocolCode'        => $p['protocol_code'] ?? '',
        'title'               => $p['title'],
        'status'              => $p['status'],
        'statusCategory'      => $p['status_category'],
        'stageLabel'          => $p['stage_label'] ?? $p['status'],
        'activeStep'          => (int)$p['active_step'],
        'reviewType'          => $reviewTrack,
        'reviewTrack'         => $reviewTrack,
        'reviewCategory'      => $reviewCategory,
        'academicUnit'        => $academicUnit,
        'academicUnitShort'   => $academicUnitShort,
        'natureStudy'         => $p['nature_study'],
        'natureStudyOther'    => $p['nature_study_other'] ?? '',
        'fieldworkLocation'   => $p['fieldwork_location'] ?? '',
        'isLabOnly'           => (bool)$p['is_lab_only'],
        'contactNumber'       => $p['contact_number'] ?? '',
        'studySummary'        => $p['study_summary'] ?? '',
        'studyObjectives'     => $p['study_objectives'] ?? '',
        'facultyAdviser'      => $p['faculty_adviser'] ?? '',
        'isIndependentPi'     => (bool)$p['is_independent_pi'],
        'academicYear'        => $p['academic_year'],
        'isPriority'          => (bool)$p['is_priority'],
        'dueDate'             => $p['due_date'] ? date('M d, Y', strtotime($p['due_date'])) : null,
        'remarks'             => $p['remarks'] ?? '',
        'clearanceCertNo'     => $p['clearance_cert_no'] ?? '',
        'clearanceValidity'   => $p['clearance_validity'] ?? '',
        'dateSubmitted'       => $dateFormatted,
        'decisionDate'        => $p['decision_date'] ? date('M d, Y', strtotime($p['decision_date'])) : null,
        'actionType'          => $isDraft ? 'edit' : 'view',
        'documents'           => $documents,
        'coInvestigators'     => $coInvestigators,
        'targetPopulations'   => $targetPopulations,
        'otherTargetPop'      => $otherTargetPop,
        'logs'                => $logs,
    ];
}

/**
 * Format protocol for Secretariat Intake Queue & Management.
 */
function formatProtocolForSecretariat(PDO $pdo, array $p): array
{
    $id = (int)$p['id'];

    // PI details
    $piStmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = ? LIMIT 1');
    $piStmt->execute([(int)$p['primary_investigator_id']]);
    $pi = $piStmt->fetch() ?: [];

    // Documents
    $docStmt = $pdo->prepare('SELECT * FROM `protocol_documents` WHERE `protocol_id` = ? ORDER BY `id` ASC');
    $docStmt->execute([$id]);
    $rawDocs = $docStmt->fetchAll();
    $documents = [];
    $verifiedDocsCount = 0;
    foreach ($rawDocs as $d) {
        $formatted = formatDocumentRow($d, $p['protocol_code']);
        if ($formatted['status'] === 'Verified') {
            $verifiedDocsCount++;
        }
        $documents[] = $formatted;
    }

    // Co-investigators
    $coStmt = $pdo->prepare('SELECT * FROM `protocol_co_investigators` WHERE `protocol_id` = ? ORDER BY `id` ASC');
    $coStmt->execute([$id]);
    $rawCo = $coStmt->fetchAll();
    $coInvestigators = [];
    foreach ($rawCo as $co) {
        $coInvestigators[] = [
            'id'          => (int)$co['id'],
            'name'        => $co['name'],
            'role'        => $co['role'],
            'affiliation' => $co['affiliation'] ?? '',
        ];
    }

    // Target populations
    $popStmt = $pdo->prepare('SELECT * FROM `protocol_target_populations` WHERE `protocol_id` = ?');
    $popStmt->execute([$id]);
    $targetPopRows = $popStmt->fetchAll();
    $targetPopulations = [];
    $otherTargetPop = '';
    foreach ($targetPopRows as $pop) {
        $targetPopulations[] = $pop['cohort_key'];
        if ($pop['cohort_key'] === 'other' && !empty($pop['custom_specification'])) {
            $otherTargetPop = $pop['custom_specification'];
        }
    }

    // Trail logs
    $logStmt = $pdo->prepare('SELECT l.*, u.full_name AS author_name FROM `investigator_trail_logs` l LEFT JOIN `users` u ON l.author_id = u.id WHERE l.protocol_id = ? ORDER BY l.created_at ASC');
    $logStmt->execute([$id]);
    $rawLogs = $logStmt->fetchAll();
    $logs = [];
    foreach ($rawLogs as $log) {
        $logs[] = [
            'id'        => (int)$log['id'],
            'badge'     => $log['badge'],
            'text'      => $log['log_text'],
            'author'    => $log['author_name'] ?? 'Secretariat Desk',
            'createdAt' => date('M d, Y h:i A', strtotime($log['created_at'])),
        ];
    }

    // Assigned Reviewers
    $revStmt = $pdo->prepare('SELECT a.*, u.full_name AS reviewer_name, u.initials AS reviewer_initials, u.email AS reviewer_email, u.panel AS reviewer_panel, u.title AS reviewer_title FROM `review_assignments` a JOIN `users` u ON a.reviewer_id = u.id WHERE a.protocol_id = ? ORDER BY a.id ASC');
    $revStmt->execute([$id]);
    $rawAssignments = $revStmt->fetchAll();
    $assignments = [];
    $activeReviewer = null;
    $docketMeeting = null;
    $docketTime = null;
    foreach ($rawAssignments as $a) {
        $item = [
            'id'             => (int)$a['id'],
            'reviewerId'     => (int)$a['reviewer_id'],
            'reviewerName'   => $a['reviewer_name'],
            'reviewerEmail'  => $a['reviewer_email'],
            'reviewerPanel'  => $a['reviewer_panel'],
            'reviewerTitle'  => $a['reviewer_title'],
            'panelName'      => $a['panel_name'] ?? $a['reviewer_panel'],
            'docketMeeting'  => $a['docket_meeting'],
            'docketTime'     => $a['docket_time'],
            'dueDate'        => $a['due_date'] ? date('M d, Y', strtotime($a['due_date'])) : null,
            'status'         => $a['status'],
            'coiCertified'   => (bool)$a['coi_certified'],
        ];
        $assignments[] = $item;
        if ($a['status'] !== 'Recused') {
            $activeReviewer = $item;
            $docketMeeting = $a['docket_meeting'];
            $docketTime = $a['docket_time'];
        }
    }

    $daysLeft = null;
    if (!empty($p['due_date'])) {
        $due = new DateTime($p['due_date']);
        $now = new DateTime('today');
        $diff = (int)$now->diff($due)->format('%r%a');
        $daysLeft = $diff >= 0 ? "{$diff} days remaining" : abs($diff) . " days overdue";
    }

    $dateSubmitted = !empty($p['date_submitted'])
        ? date('M d, Y', strtotime($p['date_submitted']))
        : date('M d, Y', strtotime($p['created_at']));

    $dateReceived = !empty($p['date_submitted'])
        ? date('M d, Y', strtotime($p['date_submitted']))
        : date('M d, Y', strtotime($p['created_at']));

    $timeReceived = !empty($p['date_submitted'])
        ? date('h:i A', strtotime($p['date_submitted']))
        : date('h:i A', strtotime($p['created_at']));

    $academicUnit = $p['academic_unit'] ?? '';
    $academicUnitShort = $p['academic_unit_short'];
    if (empty($academicUnitShort)) {
        if (preg_match('/\(([^)]+)\)/', $academicUnit, $matches)) {
            $academicUnitShort = $matches[1];
        } else {
            $academicUnitShort = 'MMSU';
        }
    }

    $actionType = 'details';
    if ($p['status'] === 'New Intake') {
        $actionType = 'check';
    } elseif ($p['status'] === 'Checking') {
        $actionType = 'continue';
    } elseif ($p['status'] === 'PI Clarification') {
        $actionType = 'deficit';
    } elseif ($p['status'] === 'Passed Intake') {
        $actionType = 'route';
    }

    $dashboardStatus = $p['status'];
    if ($p['status'] === 'New Intake') {
        $dashboardStatus = 'New Submission';
    } elseif ($p['status'] === 'Passed Intake') {
        $dashboardStatus = 'Ready to Route';
    }

    return [
        'id'                  => $id,
        'protocolId'          => $p['protocol_code'] ?: "URERB-{$id}",
        'protocolCode'        => $p['protocol_code'] ?: "URERB-{$id}",
        'title'               => $p['title'],
        'pi'                  => $pi['full_name'] ?? 'Principal Investigator',
        'piEmail'             => $pi['email'] ?? '',
        'piId'                => (int)($p['primary_investigator_id'] ?? 0),
        'academicUnit'        => $academicUnit,
        'academicUnitShort'   => $academicUnitShort,
        'college'             => $academicUnitShort,
        'collegeShort'        => $academicUnitShort,
        'academicYear'        => $p['academic_year'] ?? getAcademicYear(),
        'natureStudy'         => $p['nature_study'],
        'natureStudyOther'    => $p['nature_study_other'] ?? '',
        'fieldworkLocation'   => $p['fieldwork_location'] ?? '',
        'isLabOnly'           => (bool)$p['is_lab_only'],
        'contactNumber'       => $p['contact_number'] ?? ($pi['contact_number'] ?? ''),
        'studySummary'        => $p['study_summary'] ?? '',
        'studyObjectives'     => $p['study_objectives'] ?? '',
        'facultyAdviser'      => $p['faculty_adviser'] ?? '',
        'isIndependentPi'     => (bool)$p['is_independent_pi'],
        'reviewTrack'         => $p['review_track'],
        'reviewType'          => $p['review_track'],
        'status'              => $p['status'],
        'statusCategory'      => $p['status_category'],
        'dashboardStatus'     => $dashboardStatus,
        'actionType'          => $actionType,
        'stageLabel'          => $p['stage_label'] ?? $p['status'],
        'activeStep'          => (int)$p['active_step'],
        'isPriority'          => (bool)$p['is_priority'],
        'dateSubmitted'       => $dateSubmitted,
        'dateReceived'        => $dateReceived,
        'timeReceived'        => $timeReceived,
        'dueDate'             => $p['due_date'] ? date('M d, Y', strtotime($p['due_date'])) : null,
        'daysLeft'            => $daysLeft,
        'remarks'             => $p['remarks'] ?? '',
        'clearanceCertNo'     => $p['clearance_cert_no'] ?? '',
        'clearanceValidity'   => $p['clearance_validity'] ?? '',
        'reportReceived'      => (bool)$p['report_received'],
        'decisionDate'        => $p['decision_date'] ? date('M d, Y', strtotime($p['decision_date'])) : null,
        'verifiedDocsCount'   => $verifiedDocsCount,
        'totalDocsCount'      => count($documents),
        'documents'           => $documents,
        'coInvestigators'     => $coInvestigators,
        'targetPopulations'   => $targetPopulations,
        'otherTargetPop'      => $otherTargetPop,
        'trailLogs'           => $logs,
        'logs'                => $logs,
        'assignments'         => $assignments,
        'activeReviewer'      => $activeReviewer,
        'assignedReviewer'    => $activeReviewer,
        'docketMeeting'       => $docketMeeting,
        'docketTime'          => $docketTime,
        'primaryInvestigator' => [
            'name'    => $pi['full_name'] ?? 'Principal Investigator',
            'email'   => $pi['email'] ?? '',
            'college' => $academicUnitShort,
        ],
    ];
}

/**
 * Format protocol for Reviewer Workspace and Assigned queue.
 */
function formatProtocolForReviewer(PDO $pdo, array $p, array $assignment, ?array $evaluation = null): array
{
    $id = (int)$p['id'];

    // PI details
    $piStmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = ? LIMIT 1');
    $piStmt->execute([(int)$p['primary_investigator_id']]);
    $pi = $piStmt->fetch() ?: [];

    // Documents
    $docStmt = $pdo->prepare('SELECT * FROM `protocol_documents` WHERE `protocol_id` = ? ORDER BY `id` ASC');
    $docStmt->execute([$id]);
    $rawDocs = $docStmt->fetchAll();
    $documents = [];
    foreach ($rawDocs as $d) {
        $documents[] = formatDocumentRow($d, $p['protocol_code']);
    }

    // Co-investigators
    $coStmt = $pdo->prepare('SELECT * FROM `protocol_co_investigators` WHERE `protocol_id` = ? ORDER BY `id` ASC');
    $coStmt->execute([$id]);
    $rawCo = $coStmt->fetchAll();
    $coInvestigators = [];
    foreach ($rawCo as $co) {
        $coInvestigators[] = [
            'id'          => (int)$co['id'],
            'name'        => $co['name'],
            'role'        => $co['role'],
            'affiliation' => $co['affiliation'] ?? '',
        ];
    }

    // Target populations
    $popStmt = $pdo->prepare('SELECT * FROM `protocol_target_populations` WHERE `protocol_id` = ?');
    $popStmt->execute([$id]);
    $targetPopRows = $popStmt->fetchAll();
    $targetPopulations = [];
    foreach ($targetPopRows as $pop) {
        $targetPopulations[] = $pop['cohort_key'];
    }

    // Evaluation findings
    $findings = [];
    if (!empty($evaluation['id'])) {
        $findStmt = $pdo->prepare('SELECT * FROM `review_findings` WHERE `evaluation_id` = ? ORDER BY `id` ASC');
        $findStmt->execute([(int)$evaluation['id']]);
        $rawFind = $findStmt->fetchAll();
        foreach ($rawFind as $f) {
            $findings[] = [
                'id'          => (int)$f['id'],
                'page'        => (int)$f['page_number'],
                'section'     => $f['section_code'],
                'sectionCode' => $f['section_code'],
                'content'     => $f['content'],
                'text'        => $f['content'],
                'dateAdded'   => !empty($f['created_at']) ? date('M d, Y', strtotime($f['created_at'])) : date('M d, Y'),
            ];
        }
    }

    // Days remaining
    $daysLeft = 14;
    $dueDateStr = $assignment['due_date'] ?? $p['due_date'] ?? null;
    if ($dueDateStr) {
        $due = new DateTime($dueDateStr);
        $now = new DateTime('today');
        $diff = (int)$now->diff($due)->format('%r%a');
        $daysLeft = max(0, $diff);
    }

    $isDraftSaved = ($assignment['status'] === 'Draft Saved' || ($evaluation && !$evaluation['is_submitted']));
    $statusDisplay = $isDraftSaved ? 'Draft Saved' : $assignment['status'];

    $dateSubmitted = !empty($p['date_submitted'])
        ? date('M d, Y', strtotime($p['date_submitted']))
        : date('M d, Y', strtotime($p['created_at']));

    $academicUnit = $p['academic_unit'] ?? '';
    $academicUnitShort = $p['academic_unit_short'] ?? '';
    if (empty($academicUnitShort)) {
        if (preg_match('/\(([^)]+)\)/', $academicUnit, $matches)) {
            $academicUnitShort = $matches[1];
        } else {
            $academicUnitShort = 'MMSU';
        }
    }

    $isSubmitted = (bool)($evaluation['is_submitted'] ?? false);

    $deficientDocs = [];
    if (!empty($evaluation['additional_notes'])) {
        $decoded = json_decode($evaluation['additional_notes'], true);
        if (is_array($decoded)) {
            if (isset($decoded['deficientDocs']) && is_array($decoded['deficientDocs'])) {
                $deficientDocs = $decoded['deficientDocs'];
            } else {
                $deficientDocs = $decoded;
            }
        }
    }

    return [
        'id'                => $id,
        'assignmentId'      => (int)$assignment['id'],
        'protocolId'        => $p['protocol_code'] ?: "URERB-{$id}",
        'protocolCode'      => $p['protocol_code'] ?: "URERB-{$id}",
        'title'             => $p['title'],
        'pi'                => $pi['full_name'] ?? 'Principal Investigator',
        'piEmail'           => $pi['email'] ?? '',
        'academicUnit'      => $academicUnit,
        'academicUnitShort' => $academicUnitShort,
        'college'           => $academicUnitShort,
        'department'        => $academicUnit,
        'track'             => $p['review_track'] ?: 'Expedited Review',
        'reviewTrack'       => $p['review_track'] ?: 'Expedited Review',
        'status'            => $statusDisplay,
        'assignmentStatus'  => $assignment['status'],
        'coiCertified'      => (bool)$assignment['coi_certified'],
        'daysLeft'          => $daysLeft,
        'daysRemaining'     => $daysLeft,
        'urgent'            => ($daysLeft <= 3),
        'dueDate'           => $dueDateStr ? date('M d, Y', strtotime($dueDateStr)) : null,
        'dueFullDate'       => $dueDateStr ? date('F d, Y', strtotime($dueDateStr)) : null,
        'dateSubmitted'     => $dateSubmitted,
        'docketMeeting'     => $assignment['docket_meeting'] ?? 'Upcoming Regular Panel Session',
        'docketTime'        => $assignment['docket_time'] ?? '09:00 AM PST',
        'panelName'         => $assignment['panel_name'] ?? '',
        'studySummary'      => $p['study_summary'] ?? '',
        'studyObjectives'   => $p['study_objectives'] ?? '',
        'documents'         => $documents,
        'coInvestigators'   => $coInvestigators,
        'targetPopulations' => $targetPopulations,
        'findings'          => $findings,
        'deficientDocs'     => $deficientDocs,
        'overallComments'   => $evaluation['overall_comments'] ?? '',
        'justification'     => $evaluation['justification'] ?? '',
        'recommendedAction' => $evaluation['recommended_action'] ?? '',
        'isSubmitted'       => $isSubmitted,
        'submittedDate'     => !empty($evaluation['submitted_at']) ? date('M d, Y', strtotime($evaluation['submitted_at'])) : null,
        // Existing evaluation draft if any
        'evaluation'        => $evaluation ? [
            'id'                => (int)$evaluation['id'],
            'recommendedAction' => $evaluation['recommended_action'] ?? '',
            'overallComments'   => $evaluation['overall_comments'] ?? '',
            'justification'     => $evaluation['justification'] ?? '',
            'additionalNotes'   => $evaluation['additional_notes'] ?? '',
            'findings'          => $findings,
            'isSubmitted'       => $isSubmitted,
            'submittedAt'       => $evaluation['submitted_at'],
        ] : null,
    ];
}

/**
 * Format archived evaluation record for Reviewer History & Secretariat Archives.
 */
function formatArchiveRow(PDO $pdo, array $p, ?array $eval = null): array
{
    $id = (int)$p['id'];

    $piStmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = ? LIMIT 1');
    $piStmt->execute([(int)$p['primary_investigator_id']]);
    $pi = $piStmt->fetch() ?: [];

    // If eval not passed, load latest submitted evaluation
    if (!$eval) {
        $evalStmt = $pdo->prepare('SELECT e.*, a.status AS assignment_status FROM `review_evaluations` e JOIN `review_assignments` a ON e.assignment_id = a.id WHERE e.protocol_id = ? AND e.is_submitted = 1 ORDER BY e.id DESC LIMIT 1');
        $evalStmt->execute([$id]);
        $eval = $evalStmt->fetch() ?: [];
    }

    // Recommendation formatting
    $rec = $eval['recommended_action'] ?? ($p['status'] === 'Disapproved' ? 'Disapproved' : 'Approved');
    $decType = $eval['decision_type'] ?? ($p['status'] === 'Disapproved' ? 'disapproved' : 'approved');

    $finalDecision = 'Ethics Clearance Issued';
    $finalDecisionSub = $p['clearance_cert_no'] ?: 'Formal Certificate on File';
    if ($p['status'] === 'Disapproved') {
        $finalDecision = 'Disapproved';
        $finalDecisionSub = 'Panel Ethics Review Disposition';
    } elseif (in_array($p['status'], ['Assigned to Reviewers', 'Under Review', 'Deliberation', 'PI Clarification', 'Passed Intake', 'Checking', 'New Intake'], true)) {
        $finalDecision = 'Deliberation in Progress';
        $finalDecisionSub = 'Panel Review Pending Final Action';
    }

    $period = getAcademicYear();
    if (!empty($p['academic_year'])) {
        $period = $p['academic_year'];
    }

    // Turnaround days calculation
    $turnaroundDays = 10;
    if (!empty($p['date_submitted']) && !empty($p['decision_date'])) {
        $s = new DateTime($p['date_submitted']);
        $e = new DateTime($p['decision_date']);
        $diff = (int)$s->diff($e)->format('%a');
        if ($diff > 0) $turnaroundDays = $diff;
    }

    $dateSubmitted = !empty($p['date_submitted'])
        ? date('M d, Y', strtotime($p['date_submitted']))
        : date('M d, Y', strtotime($p['created_at']));

    $academicUnit = $p['academic_unit'] ?? '';
    $academicUnitShort = $p['academic_unit_short'] ?? '';
    if (empty($academicUnitShort)) {
        if (preg_match('/\(([^)]+)\)/', $academicUnit, $matches)) {
            $academicUnitShort = $matches[1];
        } else {
            $academicUnitShort = 'MMSU';
        }
    }

    // Status, recordType, modalBadge, decisionText
    $rawStatus = $p['status'];
    $status = 'Archived';
    $recordType = 'completed';
    $modalBadge = 'Completed';
    $decisionText = 'Approved / Cleared';

    if ($rawStatus === 'Clearance Issued') {
        $status = empty($p['report_received']) ? 'Report Due' : 'Active';
        $recordType = empty($p['report_received']) ? 'report_due' : 'completed';
        $modalBadge = 'Active Clearance';
        $decisionText = 'Ethics Clearance Issued';
    } elseif ($rawStatus === 'Completed') {
        $status = 'Completed';
        $recordType = 'completed';
        $modalBadge = 'Completed';
        $decisionText = 'Study Completed';
    } elseif ($rawStatus === 'Disapproved') {
        $status = 'Disapproved';
        $recordType = 'completed';
        $modalBadge = 'Disapproved';
        $decisionText = 'Disapproved';
    } elseif (in_array($rawStatus, ['Assigned to Reviewers', 'Under Review', 'Deliberation', 'PI Clarification', 'Passed Intake', 'Checking', 'New Intake'], true)) {
        $status = 'In Deliberation';
        $recordType = 'in_deliberation';
        $modalBadge = 'Under Deliberation';
        $decisionText = 'Deliberation in Progress';
    }

    $reviewType = 'Expedited';
    if (stripos($p['review_track'] ?? '', 'Full Board') !== false) {
        $reviewType = 'Full Board';
    } elseif (stripos($p['review_track'] ?? '', 'Exempt') !== false) {
        $reviewType = 'Exempt';
    }

    $validity = $p['clearance_validity'] ?: ($status === 'In Deliberation' ? 'Under Deliberation (Pending Clearance)' : 'Formal Record on File');

    // Assigned reviewer lookup
    $revStmt = $pdo->prepare('SELECT u.full_name FROM `review_assignments` a JOIN `users` u ON a.reviewer_id = u.id WHERE a.protocol_id = ? ORDER BY a.id ASC LIMIT 1');
    $revStmt->execute([$id]);
    $assignedRev = $revStmt->fetchColumn() ?: ($status === 'In Deliberation' ? 'Review Panel Assigned' : 'Mariano Marcos State University URERB Panel');

    // Associated documents for the record
    $docsStmt = $pdo->prepare('SELECT * FROM `protocol_documents` WHERE `protocol_id` = ? ORDER BY `id` ASC');
    $docsStmt->execute([$id]);
    $docRows = $docsStmt->fetchAll();
    $documents = [];
    foreach ($docRows as $dr) {
        $fileUrl = !empty($dr['file_path']) ? "/urerb-api/file.php?id={$dr['id']}" : null;
        $documents[] = [
            'id'        => (int)$dr['id'],
            'title'     => $dr['title'] ?: ($dr['document_key'] ?? 'Document'),
            'fileUrl'   => $fileUrl,
            'fileName'  => $dr['file_name'] ?: basename((string)$dr['file_path']),
            'fileSize'  => $dr['file_size'] ?: 'PDF',
            'meta'      => $dr['file_name'] ? "{$dr['file_name']} • " . ($dr['file_size'] ?: 'PDF') : 'Official Submission Document',
            'icon'      => 'picture_as_pdf',
            'iconColor' => 'text-emerald-700 bg-emerald-50 border-emerald-200',
        ];
    }

    $decisionDateStr = !empty($p['decision_date'])
        ? date('M d, Y', strtotime($p['decision_date']))
        : ($status === 'In Deliberation' ? 'Under Active Review' : date('M d, Y'));

    $dueDateStr = !empty($p['decision_date'])
        ? date('M d, Y', strtotime($p['decision_date'] . ' +1 year'))
        : date('M d, Y', strtotime('+1 year'));

    return [
        'id'                => $id,
        'protocolId'        => $p['protocol_code'] ?: "URERB-{$id}",
        'protocolCode'      => $p['protocol_code'] ?: "URERB-{$id}",
        'title'             => $p['title'],
        'titleShort'        => strlen($p['title']) > 65 ? substr($p['title'], 0, 62) . '...' : $p['title'],
        'pi'                => $pi['full_name'] ?? 'Principal Investigator',
        'piShort'           => $pi['full_name'] ?? 'Principal Investigator',
        'piEmail'           => $pi['email'] ?? '',
        'track'             => $p['review_track'] ?: 'Expedited Review',
        'reviewTrack'       => $p['review_track'] ?: 'Expedited Review',
        'reviewType'        => $reviewType,
        'reviewTypeFull'    => $p['review_track'] ?: 'Expedited Review',
        'academicUnit'      => $academicUnit,
        'academicUnitShort' => $academicUnitShort,
        'college'           => $academicUnitShort,
        'collegeCode'       => $academicUnitShort,
        'unit'              => $academicUnitShort,
        'unitFull'          => $academicUnit ?: 'Mariano Marcos State University',
        'period'            => $period,
        'dateSubmitted'     => $dateSubmitted,
        'recommendation'    => $rec,
        'decisionType'      => $decType,
        'finalDecision'     => $finalDecision,
        'finalDecisionSub'  => $finalDecisionSub,
        'clearanceCertNo'   => $p['clearance_cert_no'] ?? '',
        'clearanceValidity' => $p['clearance_validity'] ?? '',
        'validity'          => $validity,
        'currentValidity'   => ($p['clearance_validity'] ?? '') ?: 'Valid 1 Year Post-Approval',
        'status'            => $status,
        'rawStatus'         => $rawStatus,
        'recordType'        => $recordType,
        'modalBadge'        => $modalBadge,
        'reviewPanel'       => ($p['review_panel'] ?? '') ?: 'Panel A Review',
        'assignedReviewer'  => $assignedRev,
        'decision'          => $decisionText,
        'decisionDate'      => $decisionDateStr,
        'dueDate'           => $dueDateStr,
        'reportReceived'    => !empty($p['report_received']),
        'turnaroundDays'    => (string)$turnaroundDays,
        'evaluationNotes'   => $eval['overall_comments'] ?? '',
        'justification'     => $eval['justification'] ?? '',
        'documents'         => $documents,
    ];
}

/**
 * Insert investigator audit trail log.
 */
function addTrailLog(PDO $pdo, int $protocolId, ?int $authorId, string $badge, string $logText): void
{
    $stmt = $pdo->prepare('INSERT INTO `investigator_trail_logs` (`protocol_id`, `author_id`, `badge`, `log_text`) VALUES (?, ?, ?, ?)');
    $stmt->execute([$protocolId, $authorId, $badge, $logText]);
}

/**
 * Create a single notification.
 */
function createNotification(
    PDO $pdo,
    int $userId,
    ?int $protocolId,
    string $title,
    string $message,
    string $type = 'notice',
    ?string $actionLabel = 'View Details'
): void {
    $stmt = $pdo->prepare('INSERT INTO `notifications` (`user_id`, `protocol_id`, `title`, `message`, `type`, `action_label`) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$userId, $protocolId, $title, $message, $type, $actionLabel]);
}

/**
 * Broadcast notification to all active users with a specified role.
 */
function notifyRoleUsers(
    PDO $pdo,
    string $role,
    ?int $protocolId,
    string $title,
    string $message,
    string $type = 'notice',
    ?string $actionLabel = 'View Details'
): void {
    $stmt = $pdo->prepare('SELECT `id` FROM `users` WHERE `role` = ?');
    $stmt->execute([$role]);
    $users = $stmt->fetchAll();
    foreach ($users as $u) {
        createNotification($pdo, (int)$u['id'], $protocolId, $title, $message, $type, $actionLabel);
    }
}

/**
 * Calculate Secretariat dashboard metrics.
 */
function getSecretariatMetrics(PDO $pdo): array
{
    // New submissions awaiting initial intake completeness check
    $newSubStmt = $pdo->query("SELECT COUNT(*) FROM `protocols` WHERE `status` = 'New Intake'");
    $newSubmissions = (int)$newSubStmt->fetchColumn();

    // Under checking
    $checkingStmt = $pdo->query("SELECT COUNT(*) FROM `protocols` WHERE `status` = 'Checking'");
    $underChecking = (int)$checkingStmt->fetchColumn();

    // Pending PI clarification
    $piStmt = $pdo->query("SELECT COUNT(*) FROM `protocols` WHERE `status` = 'PI Clarification'");
    $piClarification = (int)$piStmt->fetchColumn();

    // Cleared for review / assigned / in deliberation
    $clearedStmt = $pdo->query("SELECT COUNT(*) FROM `protocols` WHERE `status` IN ('Passed Intake', 'Assigned to Reviewers', 'Under Review', 'Revision Required')");
    $clearedForReview = (int)$clearedStmt->fetchColumn();

    // Ready for clearance
    $clearanceStmt = $pdo->query("SELECT COUNT(*) FROM `protocols` WHERE `status` = 'Ready for Clearance'");
    $clearancePending = (int)$clearanceStmt->fetchColumn();

    // Total active protocols (status != Draft and not in Completed/Archived/Disapproved)
    $activeStmt = $pdo->query("SELECT COUNT(*) FROM `protocols` WHERE `status` != 'Draft' AND `status` NOT IN ('Completed', 'Archived', 'Disapproved')");
    $totalActive = (int)$activeStmt->fetchColumn();

    // Decisions completed / archived records
    $archiveStmt = $pdo->query("SELECT COUNT(*) FROM `protocols` WHERE `status` IN ('Clearance Issued', 'Completed', 'Archived', 'Disapproved')");
    $decisionsCompleted = (int)$archiveStmt->fetchColumn();

    return [
        // Frontend Dashboard keys
        'newSubmissions'     => $newSubmissions,
        'underChecking'      => $underChecking,
        'clearedForReview'   => $clearedForReview,
        'readyToRoute'       => $clearedForReview,
        'piClarification'    => $piClarification,
        'clearancePending'   => $clearancePending,
        // Overall and legacy keys
        'totalProtocols'     => $totalActive,
        'intakeChecking'     => ($newSubmissions + $underChecking + $piClarification),
        'panelDeliberation'  => $clearedForReview,
        'decisionsCompleted' => $decisionsCompleted,
    ];
}

/**
 * Generate a 100% compliant, binary-valid PDF 1.4 stream from text content.
 * Prevents "Failed to load PDF document" browser errors when text documents are saved as .pdf.
 */
function createValidPdfStream(string $title, string $content, string $headerMeta = 'MARIANO MARCOS STATE UNIVERSITY · URERB'): string
{
    $titleSafe = preg_replace('/[^\x20-\x7E]/', '', $title);
    $metaSafe = preg_replace('/[^\x20-\x7E]/', '', $headerMeta);
    $rawLines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
    $cleanLines = [];
    foreach ($rawLines as $l) {
        $clean = trim(preg_replace('/[^\x20-\x7E]/', '', $l));
        if ($clean !== '') {
            foreach (explode("\n", wordwrap($clean, 80, "\n", true)) as $wl) {
                $cleanLines[] = $wl;
            }
        }
    }
    if (empty($cleanLines)) {
        $cleanLines = ['Standard submission document file verified and registered under URERB SOP.'];
    }

    $stream = "BT\n/F1 15 Tf\n50 740 Td\n(" . addcslashes($titleSafe, "()\\") . ") Tj\n";
    $stream .= "/F1 9 Tf\n0 -20 Td\n(" . addcslashes($metaSafe, "()\\") . ") Tj\nET\n";
    $stream .= "0.1 0.3 0.2 RG 1.5 w 50 705 m 550 705 l S\nBT\n/F1 11 Tf\n50 675 Td\n";
    foreach (array_slice($cleanLines, 0, 35) as $line) {
        $stream .= "(" . addcslashes($line, "()\\") . ") Tj\n0 -16 Td\n";
    }
    $stream .= "ET\n0.7 0.7 0.7 RG 0.5 w 50 60 m 550 60 l S\nBT\n/F1 8 Tf\n50 45 Td\n(MARIANO MARCOS STATE UNIVERSITY - URERB ETHICS REVIEW PORTAL - OFFICIAL SUBMISSION FILE) Tj\nET\n";
    $streamLen = strlen($stream);

    $obj1 = "1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n";
    $obj2 = "2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n";
    $obj3 = "3 0 obj\n<</Type /Page /Parent 2 0 R /Resources <</Font <</F1 <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>>>>> /MediaBox [0 0 612 792] /Contents 4 0 R>>\nendobj\n";
    $obj4 = "4 0 obj\n<</Length {$streamLen}>>\nstream\n{$stream}\nendstream\nendobj\n";

    $header = "%PDF-1.4\n";
    $offset1 = strlen($header);
    $offset2 = $offset1 + strlen($obj1);
    $offset3 = $offset2 + strlen($obj2);
    $offset4 = $offset3 + strlen($obj3);
    $xrefOffset = $offset4 + strlen($obj4);

    $xref = "xref\n0 5\n0000000000 65535 f \n"
        . sprintf("%010d 00000 n \n", $offset1)
        . sprintf("%010d 00000 n \n", $offset2)
        . sprintf("%010d 00000 n \n", $offset3)
        . sprintf("%010d 00000 n \n", $offset4);

    $trailer = "trailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n{$xrefOffset}\n%%EOF\n";

    return $header . $obj1 . $obj2 . $obj3 . $obj4 . $xref . $trailer;
}

<?php
// ============================================================================
// MMSU URERB Portal — Role-Based Notifications Endpoints
// ============================================================================

declare(strict_types=1);

require_once __DIR__ . '/helpers/bootstrap.php';

$user = requireAuth();
$pdo = getDbConnection();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'list':
        $stmt = $pdo->prepare('SELECT n.*, p.protocol_code FROM `notifications` n LEFT JOIN `protocols` p ON n.protocol_id = p.id WHERE n.user_id = ? ORDER BY n.id DESC LIMIT 100');
        $stmt->execute([(int)$user['id']]);
        $rows = $stmt->fetchAll();

        $notifications = [];
        $unreadCount = 0;

        foreach ($rows as $n) {
            $isUnread = ((int)$n['is_read'] === 0);
            if ($isUnread) {
                $unreadCount++;
            }

            $protoCode = $n['protocol_code'] ?: ($n['protocol_id'] ? "URERB-{$n['protocol_id']}" : '');
            $timeStr = !empty($n['created_at']) ? date('M d, Y h:i A', strtotime($n['created_at'])) : 'Recent';

            // Determine icons and routes based on role and notification type
            $icon = 'notifications';
            $iconBg = 'bg-slate-100 text-slate-600';
            $category = 'Intake Alert';
            $badge = 'Notice';
            $actionRoute = '/';

            if ($user['role'] === 'researcher') {
                $actionRoute = $protoCode
                    ? "/researcher/application-tracking?id={$protoCode}"
                    : '/researcher/help-center';
                if ($n['type'] === 'revision') {
                    $badge = 'Action Required';
                } elseif ($n['type'] === 'clearance') {
                    $badge = 'Ethics Cleared';
                } else {
                    $badge = 'Intake Update';
                }
            } elseif ($user['role'] === 'secretariat') {
                $category = 'Intake Queue';
                $icon = 'fact_check';
                $iconBg = 'bg-[#d5e3fd] text-[#14432f]';
                $actionRoute = $protoCode
                    ? "/secretariat/application-checking?id={$protoCode}"
                    : '/secretariat/applications-management';

                if ($n['type'] === 'clearance') {
                    $category = 'Clearance';
                    $icon = 'verified';
                    $iconBg = 'bg-emerald-100 text-[#065f46]';
                    $actionRoute = "/secretariat/application-processing?id={$protoCode}";
                } elseif ($n['type'] === 'urgent' || $n['type'] === 'revision') {
                    $category = 'Reviewer Alert';
                    $icon = 'rate_review';
                    $iconBg = 'bg-red-100 text-rose-700';
                    $actionRoute = "/secretariat/application-processing?id={$protoCode}";
                }
            } elseif ($user['role'] === 'reviewer') {
                $badge = 'Assigned Protocol';
                $icon = 'assignment_turned_in';
                $actionRoute = "/reviewer/review-workspace?id={$protoCode}";

                if ($n['type'] === 'urgent') {
                    $badge = 'Review Window';
                    $icon = 'alarm';
                } elseif ($n['type'] === 'revision') {
                    $badge = 'Revised Protocol';
                    $icon = 'rate_review';
                }
            }

            $notifications[] = [
                'id'          => (int)$n['id'],
                'protocolId'  => $protoCode,
                'title'       => $n['title'],
                'message'     => $n['message'],
                'type'        => $n['type'],
                'badge'       => $badge,
                'category'    => $category,
                'icon'        => $icon,
                'iconBg'      => $iconBg,
                'actionLabel' => $n['action_label'] ?: 'View Details',
                'actionRoute' => $actionRoute,
                'unread'      => $isUnread,
                'isRead'      => !$isUnread,
                'timestamp'   => $timeStr,
                'time'        => $timeStr,
            ];
        }

        sendJson([
            'success'       => true,
            'notifications' => $notifications,
            'unreadCount'   => $unreadCount,
        ]);
        break;

    case 'mark-read':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getJsonBody();
        $id = (int)($body['id'] ?? 0);

        if ($id <= 0) {
            sendError('Notification ID is required.', 400);
        }

        $stmt = $pdo->prepare('UPDATE `notifications` SET `is_read` = 1 WHERE `id` = ? AND `user_id` = ?');
        $stmt->execute([$id, (int)$user['id']]);

        sendJson([
            'success' => true,
            'message' => 'Notification marked as read.',
        ]);
        break;

    case 'mark-all-read':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $stmt = $pdo->prepare('UPDATE `notifications` SET `is_read` = 1 WHERE `user_id` = ?');
        $stmt->execute([(int)$user['id']]);

        sendJson([
            'success' => true,
            'message' => 'All notifications marked as read.',
        ]);
        break;

    default:
        sendError('Invalid notifications action.', 404);
}


<?php
// ============================================================================
// MMSU URERB Portal — Initial Users Seeder (CLI only)
// ============================================================================

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "This script can only be run via CLI.\n";
    exit(1);
}

require_once __DIR__ . '/config/db.php';

$pdo = getDbConnection();

$defaultPassword = 'Urerb@2025!';
$passwordHash = password_hash($defaultPassword, PASSWORD_BCRYPT);

$starterAccounts = [
    [
        'email'         => 'secretariat@mmsu.edu.ph',
        'username'      => 'secretariat',
        'role'          => 'secretariat',
        'full_name'     => 'Maria Santos, MSPH',
        'initials'      => 'MS',
        'title'         => 'Secretariat Officer',
        'id_number'     => 'MMSU-SEC-2025-0001',
        'category'      => 'secretariat',
        'college'       => 'Office of the Vice President for Research and Extension',
        'department'    => 'Research Ethics Secretariat',
        'panel'         => null,
        'desk'          => 'SEC-04',
        'contact_number'=> '+63 (77) 600-0450',
        'office'        => 'FEM Hall 2nd Floor, URERB Secretariat Office',
        'status'        => 'Active Secretariat',
        'is_verified'   => 1,
    ],
    [
        'email'         => 'reviewer@mmsu.edu.ph',
        'username'      => 'reviewer',
        'role'          => 'reviewer',
        'full_name'     => 'Dr. Alicia G. Barba, Ph.D.',
        'initials'      => 'AB',
        'title'         => 'Scientific Reviewer — Panel A',
        'id_number'     => 'MMSU-REV-2025-0001',
        'category'      => 'faculty',
        'college'       => 'College of Health Sciences (CHS)',
        'department'    => 'Department of Nursing',
        'panel'         => 'Panel A — Clinical, Health & Biomedical Sciences',
        'desk'          => null,
        'contact_number'=> '+63 (77) 600-2041',
        'office'        => 'CHS Faculty Center, Room 204',
        'status'        => 'Active Reviewer',
        'is_verified'   => 1,
    ],
    [
        'email'         => 'ramon.castillo@mmsu.edu.ph',
        'username'      => 'rcastillo',
        'role'          => 'reviewer',
        'full_name'     => 'Dr. Ramon L. Castillo, Ph.D.',
        'initials'      => 'RC',
        'title'         => 'Scientific Reviewer — Panel B',
        'id_number'     => 'MMSU-REV-2025-0002',
        'category'      => 'faculty',
        'college'       => 'College of Arts and Sciences (CAS)',
        'department'    => 'Department of Biological Sciences',
        'panel'         => 'Panel B — Expedited Review (Natural & Biological Sciences)',
        'desk'          => null,
        'contact_number'=> '+63 (77) 600-3052',
        'office'        => 'CAS Biological Sciences Wing 3',
        'status'        => 'Active Reviewer',
        'is_verified'   => 1,
    ],
    [
        'email'         => 'teresa.villanueva@mmsu.edu.ph',
        'username'      => 'tvillanueva',
        'role'          => 'reviewer',
        'full_name'     => 'Dr. Teresa M. Villanueva, Ed.D.',
        'initials'      => 'TV',
        'title'         => 'Scientific Reviewer — Panel C',
        'id_number'     => 'MMSU-REV-2025-0003',
        'category'      => 'faculty',
        'college'       => 'College of Teacher Education (CTE)',
        'department'    => 'Graduate Studies & Educational Research',
        'panel'         => 'Panel C — Social, Behavioral & Educational Sciences',
        'desk'          => null,
        'contact_number'=> '+63 (77) 600-1120',
        'office'        => 'CTE Graduate Studies Hall',
        'status'        => 'Active Reviewer',
        'is_verified'   => 1,
    ],
    [
        'email'         => 'researcher@mmsu.edu.ph',
        'username'      => 'researcher',
        'role'          => 'researcher',
        'full_name'     => 'Dr. Juan P. Dela Cruz, Ph.D.',
        'initials'      => 'JC',
        'title'         => 'Associate Professor & Principal Investigator',
        'id_number'     => 'MMSU-CAS-2022-0418',
        'category'      => 'faculty',
        'college'       => 'College of Arts and Sciences (CAS)',
        'department'    => 'Department of Biological Sciences',
        'panel'         => null,
        'desk'          => null,
        'contact_number'=> '+63 917 555 0192',
        'office'        => 'CAS Science Complex, Room 302',
        'status'        => 'Active',
        'is_verified'   => 1,
    ],
];

echo "Seeding URERB initial accounts...\n";

$checkStmt = $pdo->prepare('SELECT `id` FROM `users` WHERE `email` = ? LIMIT 1');
$updateStmt = $pdo->prepare('UPDATE `users` SET `username` = ?, `password_hash` = ?, `role` = ?, `full_name` = ?, `initials` = ?, `title` = ?, `id_number` = ?, `category` = ?, `college` = ?, `department` = ?, `panel` = ?, `desk` = ?, `contact_number` = ?, `office` = ?, `status` = ?, `is_verified` = ? WHERE `id` = ?');
$insertStmt = $pdo->prepare('INSERT INTO `users` (`email`, `username`, `password_hash`, `role`, `full_name`, `initials`, `title`, `id_number`, `category`, `college`, `department`, `panel`, `desk`, `contact_number`, `office`, `status`, `is_verified`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

$inserted = 0;
$updated = 0;

foreach ($starterAccounts as $acc) {
    $checkStmt->execute([$acc['email']]);
    $existingId = $checkStmt->fetchColumn();

    if ($existingId) {
        $updateStmt->execute([
            $acc['username'],
            $passwordHash,
            $acc['role'],
            $acc['full_name'],
            $acc['initials'],
            $acc['title'],
            $acc['id_number'],
            $acc['category'],
            $acc['college'],
            $acc['department'],
            $acc['panel'],
            $acc['desk'],
            $acc['contact_number'],
            $acc['office'],
            $acc['status'],
            $acc['is_verified'],
            $existingId,
        ]);
        $updated++;
        echo "Updated: {$acc['email']} ({$acc['role']})\n";
    } else {
        $insertStmt->execute([
            $acc['email'],
            $acc['username'],
            $passwordHash,
            $acc['role'],
            $acc['full_name'],
            $acc['initials'],
            $acc['title'],
            $acc['id_number'],
            $acc['category'],
            $acc['college'],
            $acc['department'],
            $acc['panel'],
            $acc['desk'],
            $acc['contact_number'],
            $acc['office'],
            $acc['status'],
            $acc['is_verified'],
        ]);
        $inserted++;
        echo "Inserted: {$acc['email']} ({$acc['role']})\n";
    }
}

echo "Seeding completed: {$inserted} inserted, {$updated} updated.\n";
echo "Starter accounts credentials:\n";
echo "  Password for all accounts: {$defaultPassword}\n";


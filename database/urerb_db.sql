-- ============================================================================
-- MMSU URERB Portal — MySQL / MariaDB Database Schema for XAMPP
-- Database Name : urerb_db
-- Engine        : InnoDB
-- Charset       : utf8mb4 (utf8mb4_unicode_ci)
-- Tables        : 10 (Clean empty schema — no preloaded mock records)
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+08:00";
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `urerb_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `urerb_db`;

-- ----------------------------------------------------------------------------
-- 1. users — Authentication & Profiles (Researcher, Secretariat, Reviewer, Admin)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(150) NOT NULL,
  `username` VARCHAR(80) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('researcher', 'secretariat', 'reviewer', 'admin') NOT NULL DEFAULT 'researcher',
  `full_name` VARCHAR(150) NOT NULL,
  `initials` VARCHAR(10) DEFAULT NULL,
  `title` VARCHAR(150) DEFAULT NULL,
  `id_number` VARCHAR(50) DEFAULT NULL COMMENT 'MMSU ID or Researcher ID (e.g., MMSU-CAS-2019-0882)',
  `category` VARCHAR(80) DEFAULT NULL COMMENT 'faculty, student, graduate, external',
  `college` VARCHAR(150) DEFAULT NULL,
  `department` VARCHAR(150) DEFAULT NULL,
  `panel` VARCHAR(120) DEFAULT NULL COMMENT 'Assigned ethics review panel for reviewers',
  `desk` VARCHAR(50) DEFAULT NULL COMMENT 'Secretariat desk code (e.g., SEC-04)',
  `contact_number` VARCHAR(30) DEFAULT NULL,
  `office` VARCHAR(150) DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Active',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. protocols — Core Protocol Submissions & Lifecycle Tracking (Stages 1–5)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `protocols` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `protocol_code` VARCHAR(50) DEFAULT NULL COMMENT 'Assigned on submission (e.g., URERB-2025-063); NULL while Draft',
  `primary_investigator_id` INT UNSIGNED NOT NULL,
  `title` TEXT NOT NULL,
  `review_track` ENUM('Expedited Review', 'Full Board Review', 'Exempted Review') NOT NULL DEFAULT 'Expedited Review',
  `academic_unit` VARCHAR(200) NOT NULL,
  `academic_unit_short` VARCHAR(30) DEFAULT NULL COMMENT 'College acronym (e.g., CAS, CHS, CTE)',
  `nature_study` ENUM('undergrad', 'masters', 'dissertation', 'faculty', 'external', 'other') NOT NULL DEFAULT 'faculty',
  `nature_study_other` VARCHAR(255) DEFAULT NULL,
  `fieldwork_location` VARCHAR(255) DEFAULT NULL,
  `is_lab_only` TINYINT(1) NOT NULL DEFAULT 0,
  `contact_number` VARCHAR(30) DEFAULT NULL,
  `study_summary` TEXT DEFAULT NULL,
  `study_objectives` TEXT DEFAULT NULL,
  `faculty_adviser` VARCHAR(150) DEFAULT NULL,
  `is_independent_pi` TINYINT(1) NOT NULL DEFAULT 0,
  `academic_year` VARCHAR(20) NOT NULL DEFAULT 'AY 2024-2025',
  `active_step` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1=Submission, 2=Intake, 3=Deliberation, 4=Revision, 5=Clearance',
  `status` ENUM(
    'Draft',
    'New Intake',
    'Checking',
    'PI Clarification',
    'Passed Intake',
    'Assigned to Reviewers',
    'Under Review',
    'Revision Required',
    'Ready for Clearance',
    'Clearance Issued',
    'Completed',
    'Archived',
    'Disapproved'
  ) NOT NULL DEFAULT 'Draft',
  `status_category` ENUM('draft', 'new', 'checking', 'clarification', 'assigned', 'completed') NOT NULL DEFAULT 'draft',
  `stage_label` VARCHAR(100) DEFAULT NULL,
  `is_priority` TINYINT(1) NOT NULL DEFAULT 0,
  `due_date` DATE DEFAULT NULL,
  `remarks` TEXT DEFAULT NULL,
  `clearance_cert_no` VARCHAR(50) DEFAULT NULL,
  `clearance_validity` VARCHAR(100) DEFAULT NULL,
  `report_received` TINYINT(1) NOT NULL DEFAULT 0,
  `date_submitted` DATETIME DEFAULT NULL,
  `decision_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_protocols_code` (`protocol_code`),
  KEY `idx_protocols_pi` (`primary_investigator_id`),
  KEY `idx_protocols_status` (`status`),
  KEY `idx_protocols_category` (`status_category`),
  KEY `idx_protocols_ay` (`academic_year`),
  CONSTRAINT `fk_protocols_pi`
    FOREIGN KEY (`primary_investigator_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. protocol_target_populations — Step 1 Participant Cohorts & Custom Groups
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `protocol_target_populations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `protocol_id` INT UNSIGNED NOT NULL,
  `cohort_key` ENUM(
    'minors',
    'indigenous',
    'patients',
    'pregnant',
    'elderly',
    'pwd',
    'generalAdults',
    'notApplicable',
    'other'
  ) NOT NULL,
  `custom_specification` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_protocol_cohort` (`protocol_id`, `cohort_key`),
  CONSTRAINT `fk_target_pop_protocol`
    FOREIGN KEY (`protocol_id`) REFERENCES `protocols` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. protocol_co_investigators — Step 2 Co-Investigators & Research Team
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `protocol_co_investigators` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `protocol_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `role` VARCHAR(100) NOT NULL DEFAULT 'Co-Investigator',
  `affiliation` VARCHAR(150) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_coinv_protocol` (`protocol_id`),
  CONSTRAINT `fk_coinv_protocol`
    FOREIGN KEY (`protocol_id`) REFERENCES `protocols` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. protocol_documents — Uploaded Forms (Forms 13–17, Supporting, OR Receipt)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `protocol_documents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `protocol_id` INT UNSIGNED NOT NULL,
  `document_key` ENUM('form15', 'form16', 'form17', 'form13', 'form14', 'supporting', 'receipt') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `file_path` VARCHAR(255) DEFAULT NULL COMMENT 'Relative server file path inside uploads/',
  `file_size` VARCHAR(50) DEFAULT NULL,
  `version` VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  `is_required` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('Missing', 'Submitted', 'Uploaded', 'Verified', 'Deficient') NOT NULL DEFAULT 'Missing',
  `issue_text` TEXT DEFAULT NULL COMMENT 'Secretariat deficiency remarks',
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_docs_protocol` (`protocol_id`),
  KEY `idx_docs_key_status` (`protocol_id`, `document_key`, `status`),
  CONSTRAINT `fk_docs_protocol`
    FOREIGN KEY (`protocol_id`) REFERENCES `protocols` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. review_assignments — Secretariat Panel & Reviewer Routing (14-Day Window)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `review_assignments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `protocol_id` INT UNSIGNED NOT NULL,
  `reviewer_id` INT UNSIGNED NOT NULL,
  `assigned_by` INT UNSIGNED DEFAULT NULL,
  `panel_name` VARCHAR(150) DEFAULT NULL,
  `docket_meeting` VARCHAR(150) DEFAULT NULL,
  `docket_time` VARCHAR(100) DEFAULT NULL,
  `window_days` INT UNSIGNED NOT NULL DEFAULT 14,
  `due_date` DATE DEFAULT NULL,
  `coi_certified` TINYINT(1) NOT NULL DEFAULT 0,
  `coi_certified_at` DATETIME DEFAULT NULL,
  `status` ENUM('Pending', 'Assigned', 'In Progress', 'Draft Saved', 'Submitted', 'Completed', 'Recused') NOT NULL DEFAULT 'Assigned',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assign_protocol` (`protocol_id`),
  KEY `idx_assign_reviewer` (`reviewer_id`),
  KEY `idx_assign_by` (`assigned_by`),
  CONSTRAINT `fk_assign_protocol`
    FOREIGN KEY (`protocol_id`) REFERENCES `protocols` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_assign_reviewer`
    FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_assign_by`
    FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. review_evaluations — Reviewer Assessment Summary & Disposition
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `review_evaluations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assignment_id` INT UNSIGNED NOT NULL,
  `protocol_id` INT UNSIGNED NOT NULL,
  `reviewer_id` INT UNSIGNED NOT NULL,
  `recommended_action` ENUM('Approved', 'Minor Revisions', 'Major Revisions', 'Disapproved') DEFAULT NULL,
  `decision_type` ENUM('approved', 'revision', 'disapproved') DEFAULT NULL,
  `overall_comments` TEXT DEFAULT NULL,
  `justification` TEXT DEFAULT NULL,
  `additional_notes` TEXT DEFAULT NULL,
  `is_submitted` TINYINT(1) NOT NULL DEFAULT 0,
  `submitted_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_eval_assignment` (`assignment_id`),
  KEY `idx_eval_protocol` (`protocol_id`),
  KEY `idx_eval_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_eval_assignment`
    FOREIGN KEY (`assignment_id`) REFERENCES `review_assignments` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_eval_protocol`
    FOREIGN KEY (`protocol_id`) REFERENCES `protocols` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_eval_reviewer`
    FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. review_findings — Page & Section Review Remarks Linked to an Evaluation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `review_findings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `evaluation_id` INT UNSIGNED NOT NULL,
  `protocol_id` INT UNSIGNED NOT NULL,
  `page_number` INT UNSIGNED NOT NULL DEFAULT 1,
  `section_code` VARCHAR(120) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_findings_eval` (`evaluation_id`),
  KEY `idx_findings_protocol` (`protocol_id`),
  CONSTRAINT `fk_findings_eval`
    FOREIGN KEY (`evaluation_id`) REFERENCES `review_evaluations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_findings_protocol`
    FOREIGN KEY (`protocol_id`) REFERENCES `protocols` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. investigator_trail_logs — Audit History & Secretariat Coordination Notes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `investigator_trail_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `protocol_id` INT UNSIGNED NOT NULL,
  `author_id` INT UNSIGNED DEFAULT NULL,
  `badge` ENUM(
    'Submission',
    'Intake Passed',
    'Deficiency Notice',
    'Panel Assignment',
    'Panel Note',
    'Endorsed',
    'Revision Sent',
    'Clearance'
  ) NOT NULL,
  `log_text` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_trail_protocol` (`protocol_id`),
  KEY `idx_trail_author` (`author_id`),
  CONSTRAINT `fk_trail_protocol`
    FOREIGN KEY (`protocol_id`) REFERENCES `protocols` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_trail_author`
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. notifications — Role-Based Portal Notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `protocol_id` INT UNSIGNED DEFAULT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'notice',
  `action_label` VARCHAR(100) DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_read` (`user_id`, `is_read`),
  KEY `idx_notif_protocol` (`protocol_id`),
  CONSTRAINT `fk_notif_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notif_protocol`
    FOREIGN KEY (`protocol_id`) REFERENCES `protocols` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- OPTIONAL: Initial Portal Accounts (Keep commented out for a completely empty
-- database, or replace <PASSWORD_HASH> and uncomment when wiring backend auth)
-- ============================================================================
/*
INSERT INTO `users`
  (`email`, `username`, `password_hash`, `role`, `full_name`, `initials`, `title`, `id_number`, `college`, `department`, `panel`, `desk`, `status`, `is_verified`)
VALUES
  ('secretariat@mmsu.edu.ph', 'secretariat', '<PASSWORD_HASH>', 'secretariat', 'Maria Santos, MSPH', 'MS', 'Secretariat Officer', NULL, 'Office of the Vice President for Research and Extension', 'Research Ethics Secretariat', NULL, 'SEC-04', 'Active Secretariat', 1),
  ('reviewer@mmsu.edu.ph', 'reviewer', '<PASSWORD_HASH>', 'reviewer', 'Dr. Alicia G. Barba, Ph.D.', 'AB', 'Scientific Reviewer — Panel A', NULL, 'College of Health Sciences (CHS)', 'Department of Nursing', 'Panel A — Clinical, Health & Biomedical Sciences', NULL, 'Active Reviewer', 1),
  ('ramon.castillo@mmsu.edu.ph', 'rcastillo', '<PASSWORD_HASH>', 'reviewer', 'Dr. Ramon L. Castillo, Ph.D.', 'RC', 'Scientific Reviewer — Panel B', NULL, 'College of Arts and Sciences (CAS)', 'Department of Biological Sciences', 'Panel B — Expedited Review (Natural & Biological Sciences)', NULL, 'Active Reviewer', 1),
  ('teresa.villanueva@mmsu.edu.ph', 'tvillanueva', '<PASSWORD_HASH>', 'reviewer', 'Dr. Teresa M. Villanueva, Ed.D.', 'TV', 'Scientific Reviewer — Panel C', NULL, 'College of Teacher Education (CTE)', 'Graduate Studies & Educational Research', 'Panel C — Social, Behavioral & Educational Sciences', NULL, 'Active Reviewer', 1);
*/


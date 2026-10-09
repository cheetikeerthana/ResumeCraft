-- ====================================================================
-- ResumeCraft Database Schema
-- Database: resumecraft_db
-- Description: AI-Powered Resume Builder & Career Assistant Database
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `resumecraft_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `resumecraft_db`;

-- --------------------------------------------------------------------
-- 1. Table: users
-- Purpose: Holds registered user accounts with securely hashed passwords
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. Table: resumes
-- Purpose: Root metadata for a user's resume, supporting multiple resumes per user
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `resumes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `resume_title` VARCHAR(255) NOT NULL DEFAULT 'My Professional Resume',
  `professional_title` VARCHAR(255) DEFAULT '',
  `professional_summary` TEXT,
  `template_name` VARCHAR(50) NOT NULL DEFAULT 'modern',
  `completion_percentage` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_resumes_user_id` (`user_id`),
  INDEX `idx_resumes_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 3. Table: resume_contact
-- Purpose: Direct contact and professional link details for a resume
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `resume_contact` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `resume_id` INT NOT NULL UNIQUE,
  `phone` VARCHAR(50) DEFAULT '',
  `city` VARCHAR(100) DEFAULT '',
  `country` VARCHAR(100) DEFAULT '',
  `linkedin_url` VARCHAR(255) DEFAULT '',
  `github_url` VARCHAR(255) DEFAULT '',
  `portfolio_url` VARCHAR(255) DEFAULT '',
  `photo_path` VARCHAR(255) DEFAULT '',
  FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON DELETE CASCADE,
  INDEX `idx_contact_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 4. Table: education
-- Purpose: Academic history, degrees, colleges, GPAs, and honors
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `education` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `resume_id` INT NOT NULL,
  `institution` VARCHAR(255) NOT NULL,
  `degree` VARCHAR(255) NOT NULL,
  `field_of_study` VARCHAR(255) DEFAULT '',
  `start_date` VARCHAR(50) DEFAULT '',
  `end_date` VARCHAR(50) DEFAULT '',
  `is_current` BOOLEAN DEFAULT FALSE,
  `grade` VARCHAR(50) DEFAULT '',
  `description` TEXT,
  `display_order` INT DEFAULT 0,
  FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON DELETE CASCADE,
  INDEX `idx_education_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 5. Table: experience
-- Purpose: Work history, internships, roles, and measurable contributions
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `experience` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `resume_id` INT NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `job_title` VARCHAR(255) NOT NULL,
  `employment_type` VARCHAR(50) DEFAULT 'Full-time',
  `start_date` VARCHAR(50) DEFAULT '',
  `end_date` VARCHAR(50) DEFAULT '',
  `is_current` BOOLEAN DEFAULT FALSE,
  `responsibilities` TEXT,
  `display_order` INT DEFAULT 0,
  FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON DELETE CASCADE,
  INDEX `idx_experience_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 6. Table: skills
-- Purpose: Technical, soft, domain, and tool proficiencies
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `skills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `resume_id` INT NOT NULL,
  `skill_name` VARCHAR(100) NOT NULL,
  `skill_category` VARCHAR(50) DEFAULT 'Technical',
  `proficiency` VARCHAR(50) DEFAULT 'Intermediate',
  `display_order` INT DEFAULT 0,
  FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON DELETE CASCADE,
  INDEX `idx_skills_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 7. Table: projects
-- Purpose: Academic, open-source, or client projects with tech stack and URLs
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `resume_id` INT NOT NULL,
  `project_title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `technologies` VARCHAR(255) DEFAULT '',
  `project_url` VARCHAR(255) DEFAULT '',
  `start_date` VARCHAR(50) DEFAULT '',
  `end_date` VARCHAR(50) DEFAULT '',
  `display_order` INT DEFAULT 0,
  FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON DELETE CASCADE,
  INDEX `idx_projects_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 8. Table: certifications
-- Purpose: Professional credentials, industry certifications, licenses
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `certifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `resume_id` INT NOT NULL,
  `certification_name` VARCHAR(255) NOT NULL,
  `issuing_organization` VARCHAR(255) DEFAULT '',
  `issue_date` VARCHAR(50) DEFAULT '',
  `credential_url` VARCHAR(255) DEFAULT '',
  `display_order` INT DEFAULT 0,
  FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON DELETE CASCADE,
  INDEX `idx_certifications_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 9. Table: achievements
-- Purpose: Honors, awards, hackathon recognitions, and competitive milestones
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `achievements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `resume_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `achievement_date` VARCHAR(50) DEFAULT '',
  `display_order` INT DEFAULT 0,
  FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON DELETE CASCADE,
  INDEX `idx_achievements_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 10. Table: languages
-- Purpose: Spoken and written language proficiencies
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `languages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `resume_id` INT NOT NULL,
  `language_name` VARCHAR(100) NOT NULL,
  `proficiency` VARCHAR(50) DEFAULT 'Fluent',
  `display_order` INT DEFAULT 0,
  FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON DELETE CASCADE,
  INDEX `idx_languages_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 11. Table: applications
-- Purpose: Job search application tracker tracking status from Applied to Offer
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `applications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `job_title` VARCHAR(255) NOT NULL,
  `job_url` VARCHAR(255) DEFAULT '',
  `location` VARCHAR(100) DEFAULT '',
  `application_date` DATE DEFAULT (CURRENT_DATE),
  `status` ENUM('Saved', 'Applied', 'Interview', 'Offer', 'Rejected') NOT NULL DEFAULT 'Applied',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_applications_user_id` (`user_id`),
  INDEX `idx_applications_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 12. Table: resume_versions
-- Purpose: Preserves immutable snapshot history before AI revisions or edits
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `resume_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `resume_id` INT NOT NULL,
  `version_number` INT NOT NULL,
  `snapshot_data` LONGTEXT NOT NULL,
  `change_summary` VARCHAR(255) DEFAULT 'Snapshot prior to changes',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON DELETE CASCADE,
  INDEX `idx_versions_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 13. Table: sessions
-- Purpose: Persistent session store for express-mysql-session
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  `expires` INT(11) UNSIGNED NOT NULL,
  `data` MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ====================================================================
-- ResumeCraft Sample Seed Data
-- ====================================================================

USE `resumecraft_db`;

-- Demo User: demo@resumecraft.com / Demo@123
-- Hash generated via bcryptjs (10 rounds): $2a$10$wT0X8i4g5MvY4d.gLzYjI.2s03pT95sE4UffRfgBkmhHskVjGg1z6
INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`)
VALUES (1, 'Gayathri Budarpu', 'demo@resumecraft.com', '$2a$10$wT0X8i4g5MvY4d.gLzYjI.2s03pT95sE4UffRfgBkmhHskVjGg1z6')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Sample Resume
INSERT INTO `resumes` (`id`, `user_id`, `resume_title`, `professional_title`, `professional_summary`, `template_name`, `completion_percentage`)
VALUES (
  1,
  1,
  'Software Engineering Resume',
  'Full-Stack Developer & Software Engineer',
  'Goal-driven Computer Science graduate with strong foundations in full-stack web architectures, relational database engineering, and modern REST APIs. Experienced in building responsive interfaces with Bootstrap/vanilla JavaScript and robust Node.js/Express backends with MySQL. Passionate about developing scalable, user-centric software solutions.',
  'modern',
  95
)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Contact Info
INSERT INTO `resume_contact` (`resume_id`, `phone`, `city`, `country`, `linkedin_url`, `github_url`, `portfolio_url`)
VALUES (
  1,
  '+91 98765 43210',
  'Hyderabad',
  'India',
  'https://linkedin.com/in/gayathri-budarpu',
  'https://github.com/bgayathri',
  'https://gayathri-portfolio.dev'
)
ON DUPLICATE KEY UPDATE `resume_id` = `resume_id`;

-- Education
INSERT INTO `education` (`resume_id`, `institution`, `degree`, `field_of_study`, `start_date`, `end_date`, `is_current`, `grade`, `description`, `display_order`)
VALUES
(1, 'Jawaharlal Nehru Technological University', 'Bachelor of Technology (B.Tech)', 'Computer Science and Engineering', '2022', '2026', 0, '8.8 CGPA', 'Specialized in Web Technologies, Database Management Systems, Distributed Systems, and Data Structures.', 1),
(1, 'State Board of Intermediate Education', 'Higher Secondary Certificate (Class XII)', 'Mathematics, Physics, Chemistry', '2020', '2022', 0, '95.4%', 'Academic distinction in Mathematics and Computer Applications.', 2);

-- Experience
INSERT INTO `experience` (`resume_id`, `company_name`, `job_title`, `employment_type`, `start_date`, `end_date`, `is_current`, `responsibilities`, `display_order`)
VALUES
(1, 'Apex Cloud Solutions', 'Web Development Intern', 'Internship', 'May 2025', 'August 2025', 0, '• Engineered reusable modular UI components using Bootstrap 5 and vanilla JavaScript, boosting client page load performance by 28%.\n• Designed and integrated 12+ RESTful API endpoints in Node.js/Express with MySQL transactions for high-throughput client portals.\n• Streamlined query execution through indexing and normalized schema constraints, reducing database response times by 35%.', 1);

-- Skills
INSERT INTO `skills` (`resume_id`, `skill_name`, `skill_category`, `proficiency`, `display_order`)
VALUES
(1, 'JavaScript (ES6+)', 'Technical', 'Advanced', 1),
(1, 'Node.js & Express', 'Technical', 'Advanced', 2),
(1, 'MySQL & Relational Design', 'Technical', 'Advanced', 3),
(1, 'HTML5 & CSS3 / Bootstrap', 'Technical', 'Advanced', 4),
(1, 'RESTful API Architecture', 'Technical', 'Advanced', 5),
(1, 'Python & Data Science Basics', 'Technical', 'Intermediate', 6),
(1, 'Git & GitHub Version Control', 'Tools', 'Advanced', 7),
(1, 'Agile Problem Solving', 'Soft', 'Expert', 8),
(1, 'Technical Communication', 'Soft', 'Expert', 9);

-- Projects
INSERT INTO `projects` (`resume_id`, `project_title`, `description`, `technologies`, `project_url`, `start_date`, `end_date`, `display_order`)
VALUES
(1, 'ResumeCraft — AI Resume Builder & Career Platform', 'Architected an end-to-end full-stack web platform enabling job seekers to create customizable, ATS-friendly resumes with real-time preview, rule-based ATS evaluation, and dynamic multi-page PDF generation.', 'Node.js, Express.js, MySQL, Bootstrap 5, PDFKit, Session Auth', 'https://github.com/bgayathri/resumecraft', 'Aug 2026', 'Oct 2026', 1),
(1, 'Student Feedback Management System', 'Built an enterprise-grade academic feedback collection system with role-based authentication, structured course evaluation forms, and automated statistical aggregation reports.', 'Java, Spring Boot, MySQL, HTML5/CSS3, Chart.js', 'https://github.com/bgayathri/feedback-system', 'Jan 2026', 'April 2026', 2);

-- Certifications
INSERT INTO `certifications` (`resume_id`, `certification_name`, `issuing_organization`, `issue_date`, `credential_url`, `display_order`)
VALUES
(1, 'AWS Certified Cloud Practitioner', 'Amazon Web Services (AWS)', 'July 2025', 'https://aws.amazon.com/verification/sample', 1),
(1, 'Full-Stack Web Development Specialization', 'Coursera / Meta', 'March 2025', 'https://coursera.org/verify/sample', 2);

-- Achievements
INSERT INTO `achievements` (`resume_id`, `title`, `description`, `achievement_date`, `display_order`)
VALUES
(1, '1st Place — State Collegiate Hackathon 2025', 'Led a 4-person engineering team to design and deploy an automated disaster relief coordination dashboard within 36 hours.', 'September 2025', 1);

-- Languages
INSERT INTO `languages` (`resume_id`, `language_name`, `proficiency`, `display_order`)
VALUES
(1, 'English', 'Professional Working', 1),
(1, 'Telugu', 'Native / Bilingual', 2),
(1, 'Hindi', 'Conversational', 3);

-- Applications
INSERT INTO `applications` (`user_id`, `company_name`, `job_title`, `job_url`, `location`, `status`, `notes`)
VALUES
(1, 'Google', 'Software Engineer (University Graduate)', 'https://careers.google.com/jobs', 'Hyderabad / Bengaluru', 'Applied', 'Applied via campus outreach portal. Submitted tailored ResumeCraft ATS resume.'),
(1, 'Microsoft', 'Software Development Engineer - 1', 'https://careers.microsoft.com', 'Hyderabad, India', 'Interview', 'Technical screen cleared. Round 2 System Design and Data Structures scheduled.'),
(1, 'Amazon Web Services', 'Associate Solutions Architect', 'https://amazon.jobs', 'Bengaluru, India', 'Offer', 'Received formal offer letter. Compensation review in progress.'),
(1, 'Accenture Technology', 'Associate Software Engineer', 'https://accenture.com/careers', 'Hyderabad, India', 'Saved', 'Application requirements analyzed. Next batch opening next week.'),
(1, 'Oracle', 'Cloud Software Developer', 'https://oracle.com/careers', 'Bengaluru, India', 'Rejected', 'Role filled internally; invited to reapply for Spring 2027 cycle.');

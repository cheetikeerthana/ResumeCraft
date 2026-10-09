const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedDatabase() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3307', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'resumecraft_db';

  console.log(`Connecting to ${database} on ${host}:${port} to insert sample seed data...`);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database
  });

  try {
    // 1. Create Demo User
    const demoEmail = 'demo@resumecraft.com';
    const demoPasswordHash = await bcrypt.hash('Demo@123', 10);

    const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ?', [demoEmail]);
    let userId;

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      console.log(`Demo user already exists with ID: ${userId}`);
    } else {
      const [userResult] = await connection.execute(
        'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
        ['Gayathri Budarpu', demoEmail, demoPasswordHash]
      );
      userId = userResult.insertId;
      console.log(`Created demo user (demo@resumecraft.com / Demo@123) with ID: ${userId}`);
    }

    // 2. Check if demo resume exists
    const [existingResumes] = await connection.execute(
      'SELECT id FROM resumes WHERE user_id = ? AND resume_title = ?',
      [userId, 'Software Engineering Resume']
    );

    let resumeId;
    if (existingResumes.length > 0) {
      resumeId = existingResumes[0].id;
      console.log(`Sample resume already exists with ID: ${resumeId}`);
    } else {
      const [resResult] = await connection.execute(
        `INSERT INTO resumes (user_id, resume_title, professional_title, professional_summary, template_name, completion_percentage)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          'Software Engineering Resume',
          'Full-Stack Developer & Software Engineer',
          'Goal-driven Computer Science graduate with strong foundations in full-stack web architectures, relational database engineering, and modern REST APIs. Experienced in building responsive interfaces with Bootstrap/vanilla JavaScript and robust Node.js/Express backends with MySQL. Passionate about developing scalable, user-centric software solutions.',
          'modern',
          95
        ]
      );
      resumeId = resResult.insertId;
      console.log(`Created sample resume with ID: ${resumeId}`);

      // Contact info
      await connection.execute(
        `INSERT INTO resume_contact (resume_id, phone, city, country, linkedin_url, github_url, portfolio_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          resumeId,
          '+91 98765 43210',
          'Hyderabad',
          'India',
          'https://linkedin.com/in/gayathri-budarpu',
          'https://github.com/bgayathri',
          'https://gayathri-portfolio.dev'
        ]
      );

      // Education
      await connection.execute(
        `INSERT INTO education (resume_id, institution, degree, field_of_study, start_date, end_date, is_current, grade, description, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resumeId,
          'Jawaharlal Nehru Technological University',
          'Bachelor of Technology (B.Tech)',
          'Computer Science and Engineering',
          '2022',
          '2026',
          false,
          '8.8 CGPA',
          'Specialized in Web Technologies, Database Management Systems, Distributed Systems, and Data Structures.',
          1
        ]
      );

      await connection.execute(
        `INSERT INTO education (resume_id, institution, degree, field_of_study, start_date, end_date, is_current, grade, description, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resumeId,
          'State Board of Intermediate Education',
          'Higher Secondary Certificate (Class XII)',
          'Mathematics, Physics, Chemistry',
          '2020',
          '2022',
          false,
          '95.4%',
          'Academic distinction in Mathematics and Computer Applications.',
          2
        ]
      );

      // Experience
      await connection.execute(
        `INSERT INTO experience (resume_id, company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resumeId,
          'Apex Cloud Solutions',
          'Web Development Intern',
          'Internship',
          'May 2025',
          'August 2025',
          false,
          '• Engineered reusable modular UI components using Bootstrap 5 and vanilla JavaScript, boosting client page load performance by 28%.\n• Designed and integrated 12+ RESTful API endpoints in Node.js/Express with MySQL transactions for high-throughput client portals.\n• Streamlined query execution through indexing and normalized schema constraints, reducing database response times by 35%.',
          1
        ]
      );

      // Skills
      const sampleSkills = [
        ['JavaScript (ES6+)', 'Technical', 'Advanced', 1],
        ['Node.js & Express', 'Technical', 'Advanced', 2],
        ['MySQL & Relational Design', 'Technical', 'Advanced', 3],
        ['HTML5 & CSS3 / Bootstrap', 'Technical', 'Advanced', 4],
        ['RESTful API Architecture', 'Technical', 'Advanced', 5],
        ['Python & Data Science Basics', 'Technical', 'Intermediate', 6],
        ['Git & GitHub Version Control', 'Tools', 'Advanced', 7],
        ['Agile Problem Solving', 'Soft', 'Expert', 8],
        ['Technical Communication', 'Soft', 'Expert', 9]
      ];

      for (const s of sampleSkills) {
        await connection.execute(
          `INSERT INTO skills (resume_id, skill_name, skill_category, proficiency, display_order) VALUES (?, ?, ?, ?, ?)`,
          [resumeId, s[0], s[1], s[2], s[3]]
        );
      }

      // Projects
      await connection.execute(
        `INSERT INTO projects (resume_id, project_title, description, technologies, project_url, start_date, end_date, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resumeId,
          'ResumeCraft — AI Resume Builder & Career Platform',
          'Architected an end-to-end full-stack web platform enabling job seekers to create customizable, ATS-friendly resumes with real-time preview, rule-based ATS evaluation, and dynamic multi-page PDF generation.',
          'Node.js, Express.js, MySQL, Bootstrap 5, PDFKit, Session Auth',
          'https://github.com/bgayathri/resumecraft',
          'Aug 2026',
          'Oct 2026',
          1
        ]
      );

      await connection.execute(
        `INSERT INTO projects (resume_id, project_title, description, technologies, project_url, start_date, end_date, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resumeId,
          'Student Feedback Management System',
          'Built an enterprise-grade academic feedback collection system with role-based authentication, structured course evaluation forms, and automated statistical aggregation reports.',
          'Java, Spring Boot, MySQL, HTML5/CSS3, Chart.js',
          'https://github.com/bgayathri/feedback-system',
          'Jan 2026',
          'April 2026',
          2
        ]
      );

      // Certifications
      await connection.execute(
        `INSERT INTO certifications (resume_id, certification_name, issuing_organization, issue_date, credential_url, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          resumeId,
          'AWS Certified Cloud Practitioner',
          'Amazon Web Services (AWS)',
          'July 2025',
          'https://aws.amazon.com/verification/sample',
          1
        ]
      );

      await connection.execute(
        `INSERT INTO certifications (resume_id, certification_name, issuing_organization, issue_date, credential_url, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          resumeId,
          'Full-Stack Web Development Specialization',
          'Coursera / Meta',
          'March 2025',
          'https://coursera.org/verify/sample',
          2
        ]
      );

      // Achievements
      await connection.execute(
        `INSERT INTO achievements (resume_id, title, description, achievement_date, display_order)
         VALUES (?, ?, ?, ?, ?)`,
        [
          resumeId,
          '1st Place — State Collegiate Hackathon 2025',
          'Led a 4-person engineering team to design and deploy an automated disaster relief coordination dashboard within 36 hours.',
          'September 2025',
          1
        ]
      );

      // Languages
      await connection.execute(
        `INSERT INTO languages (resume_id, language_name, proficiency, display_order) VALUES (?, ?, ?, ?)`,
        [resumeId, 'English', 'Professional Working', 1]
      );
      await connection.execute(
        `INSERT INTO languages (resume_id, language_name, proficiency, display_order) VALUES (?, ?, ?, ?)`,
        [resumeId, 'Telugu', 'Native / Bilingual', 2]
      );
      await connection.execute(
        `INSERT INTO languages (resume_id, language_name, proficiency, display_order) VALUES (?, ?, ?, ?)`,
        [resumeId, 'Hindi', 'Conversational', 3]
      );
    }

    // 3. Sample Job Applications
    const sampleApps = [
      ['Google', 'Software Engineer (University Graduate)', 'https://careers.google.com/jobs', 'Hyderabad / Bengaluru', 'Applied', 'Applied via campus outreach portal. Submitted tailored ResumeCraft ATS resume.'],
      ['Microsoft', 'Software Development Engineer - 1', 'https://careers.microsoft.com', 'Hyderabad, India', 'Interview', 'Technical screen cleared. Round 2 System Design and Data Structures scheduled.'],
      ['Amazon Web Services', 'Associate Solutions Architect', 'https://amazon.jobs', 'Bengaluru, India', 'Offer', 'Received formal offer letter. Compensation review in progress.'],
      ['Accenture Technology', 'Associate Software Engineer', 'https://accenture.com/careers', 'Hyderabad, India', 'Saved', 'Application requirements analyzed. Next batch opening next week.'],
      ['Oracle', 'Cloud Software Developer', 'https://oracle.com/careers', 'Bengaluru, India', 'Rejected', 'Role filled internally; invited to reapply for Spring 2027 cycle.']
    ];

    for (const app of sampleApps) {
      const [existingApp] = await connection.execute(
        'SELECT id FROM applications WHERE user_id = ? AND company_name = ?',
        [userId, app[0]]
      );
      if (existingApp.length === 0) {
        await connection.execute(
          `INSERT INTO applications (user_id, company_name, job_title, job_url, location, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, app[0], app[1], app[2], app[3], app[4], app[5]]
        );
      }
    }

    console.log('Sample seed data successfully loaded into resumecraft_db!');
    console.log('Login credentials:');
    console.log('  Email:    demo@resumecraft.com');
    console.log('  Password: Demo@123');

  } catch (err) {
    console.error('Error during seeding:', err.message);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

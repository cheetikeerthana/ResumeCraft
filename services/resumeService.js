// services/resumeService.js
const { pool, withTransaction } = require('../db');

function calculateCompletionPercentage(resumeData) {
  let score = 0;
  // Contact details & name
  if (resumeData.contact && (resumeData.contact.phone || resumeData.contact.city)) score += 15;
  // Professional title
  if (resumeData.professional_title && resumeData.professional_title.trim().length > 3) score += 10;
  // Professional summary
  if (resumeData.professional_summary && resumeData.professional_summary.trim().length > 25) score += 15;
  // Education
  if (resumeData.education && resumeData.education.length > 0) score += 15;
  // Experience / Internships
  if (resumeData.experience && resumeData.experience.length > 0) score += 15;
  // Skills (at least 3 skills)
  if (resumeData.skills && resumeData.skills.length >= 3) score += 15;
  else if (resumeData.skills && resumeData.skills.length > 0) score += 5;
  // Projects
  if (resumeData.projects && resumeData.projects.length > 0) score += 10;
  // Certifications / Achievements / Languages
  if (
    (resumeData.certifications && resumeData.certifications.length > 0) ||
    (resumeData.achievements && resumeData.achievements.length > 0) ||
    (resumeData.languages && resumeData.languages.length > 0)
  ) {
    score += 5;
  }
  return Math.min(100, score);
}

// Get all resumes for user
async function getResumesByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, resume_title, professional_title, template_name, completion_percentage, created_at, updated_at
     FROM resumes
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId]
  );
  return rows;
}

// Get full resume with all relational sections
async function getResumeById(resumeId, userId) {
  // Verify ownership
  const [resumes] = await pool.execute(
    `SELECT r.*, u.full_name as user_full_name, u.email as user_email
     FROM resumes r
     JOIN users u ON r.user_id = u.id
     WHERE r.id = ? AND r.user_id = ?`,
    [resumeId, userId]
  );

  if (resumes.length === 0) {
    return null;
  }

  const resume = resumes[0];

  // Fetch contact
  const [contactRows] = await pool.execute('SELECT * FROM resume_contact WHERE resume_id = ?', [resumeId]);
  resume.contact = contactRows[0] || {
    phone: '',
    city: '',
    country: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    photo_path: ''
  };

  // Fetch sections ordered by display_order, id
  const [education] = await pool.execute(
    'SELECT * FROM education WHERE resume_id = ? ORDER BY display_order ASC, id ASC',
    [resumeId]
  );
  const [experience] = await pool.execute(
    'SELECT * FROM experience WHERE resume_id = ? ORDER BY display_order ASC, id ASC',
    [resumeId]
  );
  const [skills] = await pool.execute(
    'SELECT * FROM skills WHERE resume_id = ? ORDER BY display_order ASC, id ASC',
    [resumeId]
  );
  const [projects] = await pool.execute(
    'SELECT * FROM projects WHERE resume_id = ? ORDER BY display_order ASC, id ASC',
    [resumeId]
  );
  const [certifications] = await pool.execute(
    'SELECT * FROM certifications WHERE resume_id = ? ORDER BY display_order ASC, id ASC',
    [resumeId]
  );
  const [achievements] = await pool.execute(
    'SELECT * FROM achievements WHERE resume_id = ? ORDER BY display_order ASC, id ASC',
    [resumeId]
  );
  const [languages] = await pool.execute(
    'SELECT * FROM languages WHERE resume_id = ? ORDER BY display_order ASC, id ASC',
    [resumeId]
  );

  resume.education = education;
  resume.experience = experience;
  resume.skills = skills;
  resume.projects = projects;
  resume.certifications = certifications;
  resume.achievements = achievements;
  resume.languages = languages;

  // Recalculate completion percentage dynamically
  resume.completion_percentage = calculateCompletionPercentage(resume);

  return resume;
}

// Create new blank or seeded resume
async function createResume(userId, data = {}) {
  const title = data.resume_title || 'Untitled Resume';
  const profTitle = data.professional_title || '';
  const summary = data.professional_summary || '';
  const template = data.template_name || 'modern';

  return await withTransaction(async (conn) => {
    const [resResult] = await conn.execute(
      `INSERT INTO resumes (user_id, resume_title, professional_title, professional_summary, template_name, completion_percentage)
       VALUES (?, ?, ?, ?, ?, 10)`,
      [userId, title, profTitle, summary, template]
    );

    const resumeId = resResult.insertId;

    // Initialize contact row
    await conn.execute(
      `INSERT INTO resume_contact (resume_id, phone, city, country, linkedin_url, github_url, portfolio_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        resumeId,
        data.contact?.phone || '',
        data.contact?.city || '',
        data.contact?.country || '',
        data.contact?.linkedin_url || '',
        data.contact?.github_url || '',
        data.contact?.portfolio_url || ''
      ]
    );

    return resumeId;
  });
}

// Update main resume metadata
async function updateResume(resumeId, userId, data) {
  const resume = await getResumeById(resumeId, userId);
  if (!resume) return null;

  const merged = { ...resume, ...data };
  const completion = calculateCompletionPercentage(merged);

  await pool.execute(
    `UPDATE resumes
     SET resume_title = ?, professional_title = ?, professional_summary = ?, template_name = ?, completion_percentage = ?
     WHERE id = ? AND user_id = ?`,
    [
      merged.resume_title || 'Untitled Resume',
      merged.professional_title || '',
      merged.professional_summary || '',
      merged.template_name || 'modern',
      completion,
      resumeId,
      userId
    ]
  );

  // Update contact if provided
  if (data.contact) {
    await pool.execute(
      `INSERT INTO resume_contact (resume_id, phone, city, country, linkedin_url, github_url, portfolio_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         phone = VALUES(phone),
         city = VALUES(city),
         country = VALUES(country),
         linkedin_url = VALUES(linkedin_url),
         github_url = VALUES(github_url),
         portfolio_url = VALUES(portfolio_url)`,
      [
        resumeId,
        data.contact.phone || '',
        data.contact.city || '',
        data.contact.country || '',
        data.contact.linkedin_url || '',
        data.contact.github_url || '',
        data.contact.portfolio_url || ''
      ]
    );
  }

  return await getResumeById(resumeId, userId);
}

// Duplicate resume with all relational children via transaction
async function duplicateResume(resumeId, userId) {
  const original = await getResumeById(resumeId, userId);
  if (!original) return null;

  return await withTransaction(async (conn) => {
    const newTitle = `${original.resume_title} (Copy)`;
    const [resResult] = await conn.execute(
      `INSERT INTO resumes (user_id, resume_title, professional_title, professional_summary, template_name, completion_percentage)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        newTitle,
        original.professional_title,
        original.professional_summary,
        original.template_name,
        original.completion_percentage
      ]
    );
    const newId = resResult.insertId;

    // Contact
    if (original.contact) {
      await conn.execute(
        `INSERT INTO resume_contact (resume_id, phone, city, country, linkedin_url, github_url, portfolio_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          original.contact.phone || '',
          original.contact.city || '',
          original.contact.country || '',
          original.contact.linkedin_url || '',
          original.contact.github_url || '',
          original.contact.portfolio_url || ''
        ]
      );
    }

    // Education
    for (const item of original.education) {
      await conn.execute(
        `INSERT INTO education (resume_id, institution, degree, field_of_study, start_date, end_date, is_current, grade, description, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, item.institution, item.degree, item.field_of_study, item.start_date, item.end_date, item.is_current, item.grade, item.description, item.display_order]
      );
    }

    // Experience
    for (const item of original.experience) {
      await conn.execute(
        `INSERT INTO experience (resume_id, company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, item.company_name, item.job_title, item.employment_type, item.start_date, item.end_date, item.is_current, item.responsibilities, item.display_order]
      );
    }

    // Skills
    for (const item of original.skills) {
      await conn.execute(
        `INSERT INTO skills (resume_id, skill_name, skill_category, proficiency, display_order)
         VALUES (?, ?, ?, ?, ?)`,
        [newId, item.skill_name, item.skill_category, item.proficiency, item.display_order]
      );
    }

    // Projects
    for (const item of original.projects) {
      await conn.execute(
        `INSERT INTO projects (resume_id, project_title, description, technologies, project_url, start_date, end_date, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, item.project_title, item.description, item.technologies, item.project_url, item.start_date, item.end_date, item.display_order]
      );
    }

    // Certifications
    for (const item of original.certifications) {
      await conn.execute(
        `INSERT INTO certifications (resume_id, certification_name, issuing_organization, issue_date, credential_url, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, item.certification_name, item.issuing_organization, item.issue_date, item.credential_url, item.display_order]
      );
    }

    // Achievements
    for (const item of original.achievements) {
      await conn.execute(
        `INSERT INTO achievements (resume_id, title, description, achievement_date, display_order)
         VALUES (?, ?, ?, ?, ?)`,
        [newId, item.title, item.description, item.achievement_date, item.display_order]
      );
    }

    // Languages
    for (const item of original.languages) {
      await conn.execute(
        `INSERT INTO languages (resume_id, language_name, proficiency, display_order)
         VALUES (?, ?, ?, ?)`,
        [newId, item.language_name, item.proficiency, item.display_order]
      );
    }

    return newId;
  });
}

// Delete resume
async function deleteResume(resumeId, userId) {
  const [result] = await pool.execute('DELETE FROM resumes WHERE id = ? AND user_id = ?', [resumeId, userId]);
  return result.affectedRows > 0;
}

// Snapshot version
async function saveVersionSnapshot(resumeId, userId, summary = 'Snapshot prior to changes') {
  const resume = await getResumeById(resumeId, userId);
  if (!resume) return null;

  const [versionRows] = await pool.execute(
    'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM resume_versions WHERE resume_id = ?',
    [resumeId]
  );
  const nextVer = versionRows[0].next_version || 1;

  await pool.execute(
    `INSERT INTO resume_versions (resume_id, version_number, snapshot_data, change_summary)
     VALUES (?, ?, ?, ?)`,
    [resumeId, nextVer, JSON.stringify(resume), summary]
  );

  return nextVer;
}

module.exports = {
  getResumesByUser,
  getResumeById,
  createResume,
  updateResume,
  duplicateResume,
  deleteResume,
  calculateCompletionPercentage,
  saveVersionSnapshot
};

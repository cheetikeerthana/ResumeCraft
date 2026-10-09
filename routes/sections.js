// routes/sections.js
// Handles CRUD operations for all normalized resume sections with strict ownership verification
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const resumeService = require('../services/resumeService');

router.use(requireAuth);

// Helper to verify user ownership of the parent resume
async function verifyResumeOwnership(resumeId, userId) {
  const [rows] = await pool.execute('SELECT id FROM resumes WHERE id = ? AND user_id = ?', [resumeId, userId]);
  return rows.length > 0;
}

// --------------------------------------------------------------------
// CONTACT INFORMATION
// --------------------------------------------------------------------
router.get('/:resumeId/contact', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to resume.' });
    }

    const [rows] = await pool.execute('SELECT * FROM resume_contact WHERE resume_id = ?', [resumeId]);
    res.json({ success: true, contact: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:resumeId/contact', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to resume.' });
    }

    const { phone, city, country, linkedin_url, github_url, portfolio_url } = req.body;
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
      [resumeId, phone || '', city || '', country || '', linkedin_url || '', github_url || '', portfolio_url || '']
    );

    // Refresh completion percentage
    const updated = await resumeService.getResumeById(resumeId, req.user.id);
    await pool.execute('UPDATE resumes SET completion_percentage = ? WHERE id = ?', [updated.completion_percentage, resumeId]);

    res.json({ success: true, message: 'Contact information updated successfully.', contact: updated.contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------
// EDUCATION SECTION
// --------------------------------------------------------------------
router.post('/:resumeId/education', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { institution, degree, field_of_study, start_date, end_date, is_current, grade, description, display_order } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO education (resume_id, institution, degree, field_of_study, start_date, end_date, is_current, grade, description, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resumeId,
        institution || 'Institution Name',
        degree || 'Degree',
        field_of_study || '',
        start_date || '',
        end_date || '',
        is_current ? 1 : 0,
        grade || '',
        description || '',
        display_order || 0
      ]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Education entry added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:resumeId/education/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { institution, degree, field_of_study, start_date, end_date, is_current, grade, description, display_order } = req.body;
    await pool.execute(
      `UPDATE education
       SET institution = ?, degree = ?, field_of_study = ?, start_date = ?, end_date = ?, is_current = ?, grade = ?, description = ?, display_order = ?
       WHERE id = ? AND resume_id = ?`,
      [institution, degree, field_of_study, start_date, end_date, is_current ? 1 : 0, grade, description, display_order || 0, id, resumeId]
    );

    res.json({ success: true, message: 'Education entry updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:resumeId/education/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await pool.execute('DELETE FROM education WHERE id = ? AND resume_id = ?', [id, resumeId]);
    res.json({ success: true, message: 'Education entry deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------
// EXPERIENCE SECTION
// --------------------------------------------------------------------
router.post('/:resumeId/experience', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, display_order } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO experience (resume_id, company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resumeId,
        company_name || 'Company Name',
        job_title || 'Role',
        employment_type || 'Full-time',
        start_date || '',
        end_date || '',
        is_current ? 1 : 0,
        responsibilities || '',
        display_order || 0
      ]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Experience entry added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:resumeId/experience/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, display_order } = req.body;
    await pool.execute(
      `UPDATE experience
       SET company_name = ?, job_title = ?, employment_type = ?, start_date = ?, end_date = ?, is_current = ?, responsibilities = ?, display_order = ?
       WHERE id = ? AND resume_id = ?`,
      [company_name, job_title, employment_type, start_date, end_date, is_current ? 1 : 0, responsibilities, display_order || 0, id, resumeId]
    );

    res.json({ success: true, message: 'Experience entry updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:resumeId/experience/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await pool.execute('DELETE FROM experience WHERE id = ? AND resume_id = ?', [id, resumeId]);
    res.json({ success: true, message: 'Experience entry deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------
// SKILLS SECTION
// --------------------------------------------------------------------
router.post('/:resumeId/skills', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { skill_name, skill_category, proficiency, display_order } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO skills (resume_id, skill_name, skill_category, proficiency, display_order)
       VALUES (?, ?, ?, ?, ?)`,
      [resumeId, skill_name || 'Skill', skill_category || 'Technical', proficiency || 'Intermediate', display_order || 0]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Skill entry added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:resumeId/skills/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { skill_name, skill_category, proficiency, display_order } = req.body;
    await pool.execute(
      `UPDATE skills SET skill_name = ?, skill_category = ?, proficiency = ?, display_order = ?
       WHERE id = ? AND resume_id = ?`,
      [skill_name, skill_category, proficiency, display_order || 0, id, resumeId]
    );

    res.json({ success: true, message: 'Skill updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:resumeId/skills/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await pool.execute('DELETE FROM skills WHERE id = ? AND resume_id = ?', [id, resumeId]);
    res.json({ success: true, message: 'Skill deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------
// PROJECTS SECTION
// --------------------------------------------------------------------
router.post('/:resumeId/projects', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { project_title, description, technologies, project_url, start_date, end_date, display_order } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO projects (resume_id, project_title, description, technologies, project_url, start_date, end_date, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [resumeId, project_title || 'Project', description || '', technologies || '', project_url || '', start_date || '', end_date || '', display_order || 0]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Project added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:resumeId/projects/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { project_title, description, technologies, project_url, start_date, end_date, display_order } = req.body;
    await pool.execute(
      `UPDATE projects SET project_title = ?, description = ?, technologies = ?, project_url = ?, start_date = ?, end_date = ?, display_order = ?
       WHERE id = ? AND resume_id = ?`,
      [project_title, description, technologies, project_url, start_date, end_date, display_order || 0, id, resumeId]
    );

    res.json({ success: true, message: 'Project updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:resumeId/projects/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await pool.execute('DELETE FROM projects WHERE id = ? AND resume_id = ?', [id, resumeId]);
    res.json({ success: true, message: 'Project deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------
// CERTIFICATIONS SECTION
// --------------------------------------------------------------------
router.post('/:resumeId/certifications', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { certification_name, issuing_organization, issue_date, credential_url, display_order } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO certifications (resume_id, certification_name, issuing_organization, issue_date, credential_url, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [resumeId, certification_name || 'Certification', issuing_organization || '', issue_date || '', credential_url || '', display_order || 0]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Certification added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:resumeId/certifications/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { certification_name, issuing_organization, issue_date, credential_url, display_order } = req.body;
    await pool.execute(
      `UPDATE certifications SET certification_name = ?, issuing_organization = ?, issue_date = ?, credential_url = ?, display_order = ?
       WHERE id = ? AND resume_id = ?`,
      [certification_name, issuing_organization, issue_date, credential_url, display_order || 0, id, resumeId]
    );

    res.json({ success: true, message: 'Certification updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:resumeId/certifications/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await pool.execute('DELETE FROM certifications WHERE id = ? AND resume_id = ?', [id, resumeId]);
    res.json({ success: true, message: 'Certification deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------
// ACHIEVEMENTS SECTION
// --------------------------------------------------------------------
router.post('/:resumeId/achievements', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { title, description, achievement_date, display_order } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO achievements (resume_id, title, description, achievement_date, display_order)
       VALUES (?, ?, ?, ?, ?)`,
      [resumeId, title || 'Achievement', description || '', achievement_date || '', display_order || 0]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Achievement added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:resumeId/achievements/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { title, description, achievement_date, display_order } = req.body;
    await pool.execute(
      `UPDATE achievements SET title = ?, description = ?, achievement_date = ?, display_order = ?
       WHERE id = ? AND resume_id = ?`,
      [title, description, achievement_date, display_order || 0, id, resumeId]
    );

    res.json({ success: true, message: 'Achievement updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:resumeId/achievements/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await pool.execute('DELETE FROM achievements WHERE id = ? AND resume_id = ?', [id, resumeId]);
    res.json({ success: true, message: 'Achievement deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------
// LANGUAGES SECTION
// --------------------------------------------------------------------
router.post('/:resumeId/languages', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { language_name, proficiency, display_order } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO languages (resume_id, language_name, proficiency, display_order)
       VALUES (?, ?, ?, ?)`,
      [resumeId, language_name || 'Language', proficiency || 'Fluent', display_order || 0]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Language added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:resumeId/languages/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { language_name, proficiency, display_order } = req.body;
    await pool.execute(
      `UPDATE languages SET language_name = ?, proficiency = ?, display_order = ?
       WHERE id = ? AND resume_id = ?`,
      [language_name, proficiency, display_order || 0, id, resumeId]
    );

    res.json({ success: true, message: 'Language updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:resumeId/languages/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId, 10);
    const id = parseInt(req.params.id, 10);
    if (!(await verifyResumeOwnership(resumeId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await pool.execute('DELETE FROM languages WHERE id = ? AND resume_id = ?', [id, resumeId]);
    res.json({ success: true, message: 'Language deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

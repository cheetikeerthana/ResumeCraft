// routes/applications.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(requireAuth);

// GET /api/applications - List with search, filtering, sorting, and aggregate statistics
router.get('/', async (req, res) => {
  try {
    const { status, search, sort = 'desc' } = req.query;

    let query = 'SELECT * FROM applications WHERE user_id = ?';
    const params = [req.user.id];

    if (status && ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'].includes(status)) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim() !== '') {
      query += ' AND (company_name LIKE ? OR job_title LIKE ? OR location LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += sort.toLowerCase() === 'asc' ? ' ORDER BY application_date ASC, id ASC' : ' ORDER BY application_date DESC, id DESC';

    const [applications] = await pool.execute(query, params);

    // Aggregate statistics
    const [statsRows] = await pool.execute(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'Interview' THEN 1 ELSE 0 END) as interview,
        SUM(CASE WHEN status = 'Offer' THEN 1 ELSE 0 END) as offer,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'Saved' THEN 1 ELSE 0 END) as saved
       FROM applications
       WHERE user_id = ?`,
      [req.user.id]
    );

    const stats = statsRows[0] || { total: 0, applied: 0, interview: 0, offer: 0, rejected: 0, saved: 0 };

    res.json({
      success: true,
      applications,
      stats: {
        total: Number(stats.total || 0),
        applied: Number(stats.applied || 0),
        interview: Number(stats.interview || 0),
        offer: Number(stats.offer || 0),
        rejected: Number(stats.rejected || 0),
        saved: Number(stats.saved || 0)
      }
    });
  } catch (error) {
    console.error('[Applications] List error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve job applications.' });
  }
});

// POST /api/applications - Create job application
router.post(
  '/',
  [
    body('company_name').trim().notEmpty().withMessage('Company name is required.'),
    body('job_title').trim().notEmpty().withMessage('Job title is required.'),
    body('status').isIn(['Saved', 'Applied', 'Interview', 'Offer', 'Rejected']).withMessage('Invalid application status.')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { company_name, job_title, job_url, location, application_date, status, notes } = req.body;

      const appDate = application_date || new Date().toISOString().split('T')[0];

      const [result] = await pool.execute(
        `INSERT INTO applications (user_id, company_name, job_title, job_url, location, application_date, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, company_name, job_title, job_url || '', location || '', appDate, status || 'Applied', notes || '']
      );

      const [created] = await pool.execute('SELECT * FROM applications WHERE id = ?', [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'Application added successfully.',
        application: created[0]
      });
    } catch (error) {
      console.error('[Applications] Create error:', error);
      res.status(500).json({ success: false, message: 'Failed to record application.' });
    }
  }
);

// GET /api/applications/:id - Single application
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application record not found.' });
    }

    res.json({ success: true, application: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch application.' });
  }
});

// PUT /api/applications/:id - Update application
router.put(
  '/:id',
  [
    body('company_name').trim().notEmpty().withMessage('Company name cannot be blank.'),
    body('job_title').trim().notEmpty().withMessage('Job title cannot be blank.'),
    body('status').isIn(['Saved', 'Applied', 'Interview', 'Offer', 'Rejected']).withMessage('Invalid status.')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { company_name, job_title, job_url, location, application_date, status, notes } = req.body;

      const appDate = application_date || new Date().toISOString().split('T')[0];

      const [result] = await pool.execute(
        `UPDATE applications
         SET company_name = ?, job_title = ?, job_url = ?, location = ?, application_date = ?, status = ?, notes = ?
         WHERE id = ? AND user_id = ?`,
        [company_name, job_title, job_url || '', location || '', appDate, status, notes || '', id, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Application not found or unauthorized.' });
      }

      const [updated] = await pool.execute('SELECT * FROM applications WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Application updated successfully.',
        application: updated[0]
      });
    } catch (error) {
      console.error('[Applications] Update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update application.' });
    }
  }
);

// DELETE /api/applications/:id - Delete application
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await pool.execute('DELETE FROM applications WHERE id = ? AND user_id = ?', [id, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Application not found or unauthorized.' });
    }

    res.json({ success: true, message: 'Application record removed successfully.' });
  } catch (error) {
    console.error('[Applications] Delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete application.' });
  }
});

module.exports = router;

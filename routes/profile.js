// routes/profile.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(requireAuth);

// GET /api/profile
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, full_name, email, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const user = users[0];

    // Counts
    const [resumeCounts] = await pool.execute('SELECT COUNT(*) as count FROM resumes WHERE user_id = ?', [req.user.id]);
    const [appCounts] = await pool.execute('SELECT COUNT(*) as count FROM applications WHERE user_id = ?', [req.user.id]);

    res.json({
      success: true,
      profile: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at,
        stats: {
          totalResumes: resumeCounts[0].count,
          totalApplications: appCounts[0].count
        }
      }
    });
  } catch (error) {
    console.error('[Profile] Get profile error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving user profile.' });
  }
});

// PUT /api/profile
router.put(
  '/',
  [
    body('full_name').trim().notEmpty().withMessage('Full name cannot be empty.').isLength({ min: 2, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { full_name } = req.body;
      await pool.execute('UPDATE users SET full_name = ? WHERE id = ?', [full_name, req.user.id]);
      req.session.userName = full_name;

      res.json({
        success: true,
        message: 'Profile information updated successfully.',
        user: {
          id: req.user.id,
          name: full_name,
          email: req.user.email
        }
      });
    } catch (error) {
      console.error('[Profile] Update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update profile details.' });
    }
  }
);

// PUT /api/profile/password
router.put(
  '/password',
  [
    body('current_password').notEmpty().withMessage('Current password is required.'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
    body('confirm_password').custom((val, { req }) => {
      if (val !== req.body.new_password) {
        throw new Error('New password and confirmation do not match.');
      }
      return true;
    })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { current_password, new_password } = req.body;

      const [users] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password entered is incorrect.' });
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(new_password, salt);

      await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

      res.json({
        success: true,
        message: 'Password changed successfully.'
      });
    } catch (error) {
      console.error('[Profile] Change password error:', error);
      res.status(500).json({ success: false, message: 'Failed to update password.' });
    }
  }
);

// DELETE /api/profile (Account Deletion with Confirmation)
router.delete(
  '/',
  [
    body('confirm_text').equals('DELETE').withMessage('Please type DELETE to confirm account removal.'),
    body('password').notEmpty().withMessage('Password verification is required for account deletion.')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { password } = req.body;

      const [users] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const isMatch = await bcrypt.compare(password, users[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect password. Account deletion aborted.' });
      }

      // Cascading deletion handles resumes, contact, sections, applications automatically via FKs
      await pool.execute('DELETE FROM users WHERE id = ?', [req.user.id]);

      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({
          success: true,
          message: 'Your account and all associated resumes and applications have been permanently deleted.'
        });
      });
    } catch (error) {
      console.error('[Profile] Delete account error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete user account.' });
    }
  }
);

module.exports = router;

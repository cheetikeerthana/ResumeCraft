// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { validateRequest } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');

// Rate limiting against brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per IP per window
  message: {
    success: false,
    message: 'Too many login/registration attempts from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// GET /api/auth/csrf-token
router.get('/csrf-token', (req, res) => {
  res.json({
    success: true,
    csrfToken: req.session.csrfToken || ''
  });
});

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  [
    body('full_name')
      .trim()
      .notEmpty()
      .withMessage('Full name is required.')
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters.'),
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long.'),
    body('confirm_password')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password.');
        }
        return true;
      })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { full_name, email, password } = req.body;

      // Check if user already exists
      const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists. Please log in instead.'
        });
      }

      // Hash password using bcryptjs
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const [result] = await pool.execute(
        'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
        [full_name, email, password_hash]
      );

      const newUserId = result.insertId;

      // Regenerate session to protect against session fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error('[Auth] Session regeneration error:', err);
          return res.status(500).json({ success: false, message: 'Session initialization failed.' });
        }

        req.session.userId = newUserId;
        req.session.userEmail = email;
        req.session.userName = full_name;

        res.status(201).json({
          success: true,
          message: 'Registration successful! Welcome to ResumeCraft.',
          user: {
            id: newUserId,
            name: full_name,
            email: email
          }
        });
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred during registration. Please try again later.'
      });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('Please provide a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const [users] = await pool.execute(
        'SELECT id, full_name, email, password_hash FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password combination. Please check your credentials.'
        });
      }

      const user = users[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password combination. Please check your credentials.'
        });
      }

      // Session regeneration
      req.session.regenerate((err) => {
        if (err) {
          console.error('[Auth] Session regeneration error:', err);
          return res.status(500).json({ success: false, message: 'Session login failed.' });
        }

        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.full_name;

        res.json({
          success: true,
          message: 'Login successful! Redirecting to dashboard...',
          user: {
            id: user.id,
            name: user.full_name,
            email: user.email
          }
        });
      });
    } catch (error) {
      console.error('[Auth] Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during authentication. Please try again.'
      });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Session destroy error:', err);
      return res.status(500).json({ success: false, message: 'Could not log out session.' });
    }
    res.clearCookie('connect.sid');
    res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      success: true,
      authenticated: true,
      user: {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail
      }
    });
  }

  res.json({
    success: true,
    authenticated: false,
    user: null
  });
});

module.exports = router;

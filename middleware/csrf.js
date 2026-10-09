// middleware/csrf.js
const crypto = require('crypto');

function csrfProtection(req, res, next) {
  // Ensure session has a CSRF token
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Set CSRF token in an accessible cookie for client Fetch requests
  res.cookie('XSRF-TOKEN', req.session.csrfToken, {
    httpOnly: false, // Accessible to JavaScript Fetch headers
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  // Safe HTTP methods do not mutate state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt auth registration and login endpoints from CSRF token requirement
  // (Standard practice to avoid token race condition before session establishment)
  const exemptPaths = ['/api/auth/login', '/api/auth/register'];
  if (exemptPaths.includes(req.path)) {
    return next();
  }

  // Check CSRF token from header or body
  const clientToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'] || req.body?._csrf;

  if (!clientToken || clientToken !== req.session.csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF security token. Please refresh the page and try again.'
    });
  }

  next();
}

module.exports = {
  csrfProtection
};

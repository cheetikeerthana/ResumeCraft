// middleware/auth.js
// Protects routes and APIs ensuring validated server-side session authentication

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      email: req.session.userEmail,
      name: req.session.userName
    };
    return next();
  }

  // Handle API vs page requests
  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to proceed.'
    });
  }

  const redirectUrl = encodeURIComponent(req.originalUrl || '/dashboard.html');
  return res.redirect(`/login.html?redirect=${redirectUrl}`);
}

// Redirect already-logged-in users from landing, login, register to dashboard
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard.html');
  }
  next();
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated
};

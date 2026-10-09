// server.js
// Main entry point for ResumeCraft — AI-Powered Resume Builder and Career Assistant
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const { pool, testConnection, isDbConnected, getLastError, closePool, dbConfig } = require('./db');
const { csrfProtection } = require('./middleware/csrf');
const { requireAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const resumesRoutes = require('./routes/resumes');
const sectionsRoutes = require('./routes/sections');
const assistantRoutes = require('./routes/assistant');
const applicationsRoutes = require('./routes/applications');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com'
        ],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://generativelanguage.googleapis.com']
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Persistent MySQL Session Store Configuration
const sessionStoreOptions = {
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};

let sessionStore;
try {
  sessionStore = new MySQLStore(sessionStoreOptions, pool);
  console.log('[Session] MySQL persistent session store initialized.');
} catch (err) {
  console.warn('[Session] Warning: MySQL session store init fallback:', err.message);
  sessionStore = new session.MemoryStore();
}

app.use(
  session({
    key: 'resumecraft.sid',
    secret: process.env.SESSION_SECRET || 'resumecraft_dev_secret_key_college_2026',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

// Apply CSRF protection
app.use(csrfProtection);

// Page Authentication Guard for protected static views
const protectedPages = [
  '/dashboard.html',
  '/resume-builder.html',
  '/resume-preview.html',
  '/resume-assistant.html',
  '/applications.html',
  '/profile.html'
];

app.use((req, res, next) => {
  if (protectedPages.includes(req.path)) {
    if (!req.session || !req.session.userId) {
      const redirectTarget = encodeURIComponent(req.originalUrl);
      return res.redirect(`/login.html?redirect=${redirectTarget}`);
    }
  }
  next();
});

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

// Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ResumeCraft AI Resume Builder & Career Assistant',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    database: {
      connected: isDbConnected(),
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      lastError: getLastError()
    },
    aiIntegration: {
      configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== ''),
      provider: 'Google Gemini',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      fallback: 'Rule-Based Deterministic Assistant Engine'
    }
  });
});

// Database Test Endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const [result] = await pool.execute('SELECT 1 + 1 AS test_sum, NOW() AS mysql_time, VERSION() AS mysql_version');
    const [tables] = await pool.execute('SHOW TABLES');
    res.json({
      success: true,
      message: 'Database connection test succeeded!',
      queryResult: result[0],
      tablesCount: tables.length,
      tables: tables.map(t => Object.values(t)[0])
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database query failed.',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/resumes', resumesRoutes);
app.use('/api/resumes', sectionsRoutes);
app.use('/api/resumes', assistantRoutes);
app.use('/api/applications', applicationsRoutes);

// 404 Handler for APIs
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.'
  });
});

// Start Server and Test DB
async function startServer() {
  await testConnection();

  const server = app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 ResumeCraft is running smoothly on: http://localhost:${PORT}`);
    console.log(`📊 Health Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  DB Test Endpoint: http://localhost:${PORT}/api/db-test`);
    console.log(`================================================================`);
  });

  // Graceful Shutdown
  const handleShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Initiating graceful termination...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await closePool();
      console.log('[Server] Shutdown complete.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

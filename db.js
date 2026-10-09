const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'resumecraft_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  dateStrings: true
};

console.log(`[DB] Configuring MySQL connection pool targeting ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

const pool = mysql.createPool(dbConfig);
let isConnected = false;
let lastError = null;

// Initial connection test
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    isConnected = true;
    lastError = null;
    console.log('[DB] MySQL connection pool initialized and verified successfully.');
    connection.release();
    return true;
  } catch (err) {
    isConnected = false;
    lastError = err.message;
    console.error(`[DB] Warning: MySQL connection failed (${err.code || err.message}).`);
    return false;
  }
}

// Transaction execution helper
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Graceful pool shutdown
async function closePool() {
  try {
    console.log('[DB] Closing MySQL connection pool...');
    await pool.end();
    console.log('[DB] MySQL connection pool terminated cleanly.');
  } catch (err) {
    console.error('[DB] Error closing pool:', err.message);
  }
}

module.exports = {
  pool,
  testConnection,
  isDbConnected: () => isConnected,
  getLastError: () => lastError,
  withTransaction,
  closePool,
  dbConfig
};

const mysql = require('mysql2/promise');
const logger = require('./logger');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables', { 
    missing: missingEnvVars 
  });
  process.exit(1);
}

// Create connection pool for better performance
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'exam_system',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Query timeout
  connectTimeout: 10000,
  // Additional security
  multipleStatements: false, // Prevent SQL injection via multiple statements
  dateStrings: true
};

const pool = mysql.createPool(poolConfig);

// Test connection and log status
pool.getConnection()
  .then(connection => {
    logger.info('✅ Database connected successfully', {
      host: poolConfig.host,
      database: poolConfig.database,
      connectionLimit: poolConfig.connectionLimit
    });
    connection.release();
  })
  .catch(err => {
    logger.error('❌ Database connection failed', { 
      error: err.message,
      code: err.code,
      host: poolConfig.host
    });
    process.exit(1);
  });

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { 
    error: err.message,
    code: err.code 
  });
  
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    logger.error('Database connection lost. Attempting to reconnect...');
  }
});

module.exports = pool;

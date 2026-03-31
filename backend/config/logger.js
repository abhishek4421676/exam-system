const winston = require('winston');
const path = require('path');


const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');

// Detect if running in a read-only/serverless environment
let canWriteLogs = true;
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
} catch (err) {
  canWriteLogs = false;
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);


let logger;
if (canWriteLogs) {
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'exam-system' },
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5,
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'exceptions.log'),
      }),
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'rejections.log'),
      }),
    ],
  });
} else {
  // Fallback: Console-only logger for read-only/serverless environments
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: consoleFormat,
    defaultMeta: { service: 'exam-system' },
    transports: [
      new winston.transports.Console({
        format: consoleFormat,
      }),
    ],
  });
}

// Add console transport in development (if not already present)
if (process.env.NODE_ENV !== 'production' && canWriteLogs) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;

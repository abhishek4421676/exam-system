const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import logger
const logger = require('./config/logger');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { resolveTenant } = require('./middleware/tenant.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./routes/exam.routes');
const questionRoutes = require('./routes/question.routes');
const attemptRoutes = require('./routes/attempt.routes');
const tenantRoutes = require('./routes/tenant.routes');
const invitationRoutes = require('./routes/invitation.routes');

// Import database connection
require('./config/connection');
const { runMigrations } = require('./database/migrations');

// Initialize express app
const app = express();

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Trust proxy (if behind nginx/load balancer)
app.set('trust proxy', 1);

// Rate limiting
app.use('/api', apiLimiter);

// Tenant resolution (subdomain-based isolation)
app.use('/api', resolveTenant);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api', attemptRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Online Examination System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      exams: '/api/exams',
      questions: '/api/questions',
      attempts: '/api/attempts',
      tenant: '/api/tenant',
      health: '/health'
    }
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
let server;

const startServer = async () => {
  await runMigrations();

  server = app.listen(PORT, () => {
    logger.info('='.repeat(50));
    logger.info('🚀 Online Examination System API');
    logger.info('='.repeat(50));
    logger.info(`✅ Server is running on port ${PORT}`);
    logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📝 API Base URL: http://localhost:${PORT}/api`);
    logger.info(`❤️  Health Check: http://localhost:${PORT}/health`);
    logger.info('='.repeat(50));
  });
};

startServer().catch((err) => {
  logger.error('❌ Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    require('./config/connection').end()
      .then(() => {
        logger.info('Database connections closed');
        process.exit(0);
      })
      .catch((err) => {
        logger.error('Error during database shutdown', { error: err.message });
        process.exit(1);
      });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle process termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('❌ Unhandled Promise Rejection', { 
    error: err.message,
    stack: err.stack 
  });
  gracefulShutdown('unhandledRejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception', { 
    error: err.message,
    stack: err.stack 
  });
  gracefulShutdown('uncaughtException');
});

module.exports = app;

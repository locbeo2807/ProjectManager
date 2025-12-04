require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { performanceMonitor, requestLogger } = require('./middleware/performance');
const { globalErrorHandler, AppError } = require('./utils/error');

// Kết nối đến MongoDB
connectDB();

const app = express();

// Set security HTTP headers
app.use(helmet());

// Middleware
app.use(cors({
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware ghi log
app.use(requestLogger);
app.use(performanceMonitor);

// Rate limiting to prevent brute-force attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply the rate limiting middleware to all API routes
app.use('/api', apiLimiter);

// Route gốc
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Source Code Management API' });
});

// Route thông tin API
app.get('/api', (req, res) => {
  res.json({
    message: 'API Endpoints',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      projects: '/api/projects',
      modules: '/api/modules',
      sprints: '/api/sprints',
      tasks: '/api/tasks',
      notifications: '/api/notifications',
    }
  });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/modules', require('./routes/moduleRoutes'));
app.use('/api/sprints', require('./routes/sprintRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/conversations', require('./routes/conversationRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));
app.use('/api/risks', require('./routes/riskRoutes'));
app.use('/api/technical-debts', require('./routes/technicalDebtRoutes'));
app.use('/api/epics', require('./routes/epicRoutes'));
app.use('/api/metrics', require('./routes/metricsRoutes'));
app.use('/api/handover-files', require('./routes/handoverFiles'));
app.use('/api/test', require('./routes/testRoute'));

// Handle unhandled routes
// Start SLA monitoring
const { scheduleSLAMonitoring } = require('./services/slaMonitoringService');
scheduleSLAMonitoring();

// Start automated notifications
const { scheduleAutomatedNotifications } = require('./services/automatedNotificationService');
scheduleAutomatedNotifications();

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app; 
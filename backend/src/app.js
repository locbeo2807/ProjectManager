require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const csp = require('helmet-csp');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const { performanceMonitor, requestLogger } = require('./middleware/performance');
const { globalErrorHandler, AppError } = require('./utils/error');

// Kết nối đến MongoDB
connectDB();

const app = express();

// Set security HTTP headers
app.use(helmet());

// Cấu hình CORS chi tiết
const corsOptions = {
  origin: process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Áp dụng CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Cấu hình CSP
app.use(csp({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
    frameSrc: ["'self'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: []
  }
}));

// Middleware xử lý body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Tạo thư mục logs nếu chưa tồn tại
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Tạo rotating write stream cho access log
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d', // rotate daily
  path: logDirectory,
  compress: 'gzip'
});

// Ghi log HTTP request vào file
app.use(morgan('combined', { 
  stream: accessLogStream,
  skip: (req) => req.originalUrl === '/healthcheck' // Bỏ qua healthcheck
}));

// Ghi log vào console trong môi trường dev
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Middleware ghi log tùy chỉnh
app.use(requestLogger);
app.use(performanceMonitor);

// Rate limiting to prevent brute-force attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for each IP to 1000 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply the rate limiting middleware to all API routes
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/healthcheck', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Route gốc
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Source Code Management API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
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
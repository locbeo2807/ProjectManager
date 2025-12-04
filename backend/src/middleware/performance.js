const logger = require('../utils/logger');

exports.performanceMonitor = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      user: req.user ? req.user._id : 'anonymous'
    };

    // Log slow requests
    if (duration > 1000) {
      logger.warn(`Slow request: ${JSON.stringify(logData)}`);
    } else if (res.statusCode >= 400) {
      logger.error(`Error response: ${JSON.stringify(logData)}`);
    } else {
      logger.info(`Request completed: ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
};

// Request logging middleware
exports.requestLogger = (req, res, next) => {
  logger.http(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
};
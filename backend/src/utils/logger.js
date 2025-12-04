const winston = require('winston');

// Xác định cấp độ log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Xác định màu sắc cho từng cấp độ
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Yêu cầu winston liên kết các màu sắc
winston.addColors(colors);

// Xác định định dạng của log
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Xác định transports mà logger phải sử dụng để in ra thông điệp
const transports = [
  // Cho phép sử dụng console để in ra thông điệp
  new winston.transports.Console(),
  // Cho phép in tất cả thông điệp cấp độ lỗi vào file error.log
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  // Cho phép in tất cả thông điệp lỗi vào file all.log
  new winston.transports.File({ filename: 'logs/all.log' }),
];

// Tạo instance logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format,
  transports,
});

module.exports = logger;
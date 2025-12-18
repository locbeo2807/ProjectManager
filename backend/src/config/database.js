const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Tăng giới hạn bộ nhớ cho query
mongoose.set('maxTimeMS', 30000); // 30 seconds timeout cho mỗi query

// Tùy chọn kết nối
const options = {
  serverSelectionTimeoutMS: 10000, // Thời gian chờ chọn server (10s)
  socketTimeoutMS: 45000,          // Thời gian chờ socket (45s)
  maxPoolSize: 10,                // Số kết nối tối đa trong pool
  minPoolSize: 2,                 // Số kết nối tối thiểu trong pool
  maxIdleTimeMS: 30000,           // Thời gian tối đa một kết nối có thể ở trạng thái idle
  retryWrites: true,              // Thử lại các thao tác ghi bị lỗi
  retryReads: true,               // Thử lại các thao tác đọc bị lỗi
  connectTimeoutMS: 10000,        // Thời gian chờ kết nối ban đầu (10s)
  heartbeatFrequencyMS: 10000,    // Tần suất gửi heartbeat (10s)
};

// Kết nối đến MongoDB với retry logic
const connectDB = async (retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, options);
      logger.info('✅ Đã kết nối thành công đến MongoDB');
      
      // Xử lý sự kiện kết nối
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB đã kết nối');
      });

      mongoose.connection.on('error', (err) => {
        logger.error(`Lỗi kết nối MongoDB: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB đã ngắt kết nối');
      });

      // Xử lý sự kiện SIGINT để đóng kết nối đúng cách
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        logger.info('Đã đóng kết nối MongoDB do tắt ứng dụng');
        process.exit(0);
      });

      return;
    } catch (err) {
      logger.error(`Lỗi kết nối MongoDB (Thử lại ${i + 1}/${retries}):`, err.message);
      
      // Nếu đây là lần thử cuối cùng, ném lỗi
      if (i === retries - 1) {
        logger.error('Không thể kết nối đến MongoDB sau nhiều lần thử');
        if (process.env.NODE_ENV !== 'test') {
          process.exit(1);
        }
        throw err;
      }
      
      // Chờ trước khi thử lại
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Middleware để kiểm tra trạng thái kết nối
const checkConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) { // 1 = connected
    return res.status(503).json({
      status: 'error',
      message: 'Mất kết nối cơ sở dữ liệu. Vui lòng thử lại sau.'
    });
  }
  next();
};

module.exports = {
  connectDB,
  checkConnection,
  mongoose
};
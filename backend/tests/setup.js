// File thiết lập kiểm thử
require('dotenv').config({ path: '.env.test' });

// Thiết lập môi trường kiểm thử
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock dịch vụ email cho kiểm thử
jest.mock('../src/utils/email', () => ({
  sendOTP: jest.fn().mockResolvedValue(true)
}));

// Mock cloudinary cho kiểm thử
jest.mock('../src/config/cloudinary', () => ({
  uploader: {
    destroy: jest.fn().mockResolvedValue({ result: 'ok' })
  }
}));

// Mock bcryptjs for fast hashing in tests
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(() => Promise.resolve('salt')),
  hash: jest.fn((password, salt) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password, hash) => Promise.resolve(hash === `hashed_${password}`)),
}));

// Mock quản lý socket
jest.mock('../src/socket', () => ({
  sendNotification: jest.fn(),
  broadcastToSprintRoom: jest.fn(),
  broadcastToProjectRoom: jest.fn(),
  getIO: jest.fn().mockReturnValue(null)
}));

// Thời gian chờ toàn cục cho kiểm thử
jest.setTimeout(15000);

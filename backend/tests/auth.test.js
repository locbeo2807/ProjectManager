const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

// Increase timeout for slow tests
jest.setTimeout(60000);

describe('Authentication API', () => {
  afterAll(async () => {
    // Dọn dẹp và đóng kết nối
    await User.deleteMany({});
    // Note: Mongoose connection will be closed by global teardown
  });

  beforeEach(async () => {
    // Dọn dẹp người dùng trước mỗi kiểm thử
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toContain('Đăng ký thành công');
      expect(response.body.mfa).toBe(true);
      expect(response.body.userId).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      // Tạo người dùng đã tồn tại
      await User.create({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123',
        status: 'hoạt động'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'existing@example.com',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.message).toContain('Email đã được đăng ký');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Dữ liệu không hợp lệ');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Tạo người dùng kiểm thử
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        status: 'hoạt động',
        is_mfa_enabled: true,
        mfa_type: 'email'
      });
    });

    it('should login successfully and require OTP', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.message).toContain('Vui lòng kiểm tra email');
      expect(response.body.mfa).toBe(true);
      expect(response.body.userId).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(400);

      expect(response.body.message).toContain('Email hoặc mật khẩu không đúng');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    let userId;
    let otpCode;

    beforeEach(async () => {
      // Tạo người dùng và mô phỏng đăng nhập để lấy OTP
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        status: 'chờ xác thực',
        is_mfa_enabled: true,
        mfa_type: 'email',
        otp_code: '123456',
        otp_expired: new Date(Date.now() + 10 * 60 * 1000)
      });

      userId = user._id;
      otpCode = user.otp_code;
    });

    it('should verify OTP and complete authentication', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: userId,
          otp: otpCode
        })
        .expect(200);

      expect(response.body.message).toContain('Tài khoản đã được kích hoạt');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
    });

    it('should reject invalid OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: userId,
          otp: '999999'
        })
        .expect(400);

      expect(response.body.message).toContain('OTP không đúng');
    });
  });
});

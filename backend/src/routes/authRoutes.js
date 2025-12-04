const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, otpSchema, resendOtpSchema } = require('../utils/validation');

// Đăng ký người dùng mới
router.post('/register', validate(registerSchema), authController.register);

// Đăng nhập người dùng
router.post('/login', validate(loginSchema), authController.login);

// Lấy người dùng hiện tại
router.get('/me', authenticate, authController.getCurrentUser);

// Xác thực OTP
router.post('/verify-otp', validate(otpSchema), authController.verifyOTP);

// Gửi lại OTP
router.post('/resend-otp', validate(resendOtpSchema), authController.resendOTP);

// Làm mới token
router.post('/refresh-token', authController.refreshToken);

// Bật 2FA
router.post('/enable-2fa', authenticate, authController.enable2FA);

// Tắt 2FA
router.post('/disable-2fa', authenticate, authController.disable2FA);

module.exports = router; 
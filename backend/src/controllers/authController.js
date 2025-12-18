const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { createError: AppError } = require('../utils/error');
const catchAsync = require('../utils/catchAsync');
const { sendOTP } = require('../utils/email');

// Helper: sinh OTP 6 số
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: kiểm tra số lần nhập OTP
const MAX_OTP_ATTEMPTS = 5;
async function handleOTPAttempts(user) {
  user.otp_attempts = (user.otp_attempts || 0) + 1;
  if (user.otp_attempts >= MAX_OTP_ATTEMPTS) {
    user.status = 'bị khóa';
  }
  await user.save();
}

// Helper: sinh accessToken và refreshToken
async function createAccessToken(user) {
  const options = { expiresIn: '1h' };
  if (process.env.JWT_AUDIENCE) options.audience = process.env.JWT_AUDIENCE;
  if (process.env.JWT_ISSUER) options.issuer = process.env.JWT_ISSUER;
  const roleName = user.role || 'Developer'; // Use role directly from user object
  const payload = { _id: user._id, userID: user.userID, role: roleName };
  return jwt.sign(payload, process.env.JWT_SECRET, options);
}
async function createRefreshToken(user) {
  const options = { expiresIn: '7d' };
  if (process.env.JWT_AUDIENCE) options.audience = process.env.JWT_AUDIENCE;
  if (process.env.JWT_ISSUER) options.issuer = process.env.JWT_ISSUER;
  const roleName = user.role || 'Developer'; // Use role directly from user object
  const payload = { _id: user._id, userID: user.userID, role: roleName };
  return jwt.sign(payload, process.env.JWT_SECRET, options);
}

// Register new user - Updated to remove OTP requirement
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, phoneNumber, gender } = req.body;

  // Enhanced validation for workflow
  if (!name || !email || !password) {
    return next(AppError('Vui lòng nhập đầy đủ tên, email và mật khẩu', 400));
  }

  // Check if user already exists with active status
  const existingUser = await User.findOne({ email, status: 'hoạt động' });
  if (existingUser) {
    return next(AppError('Email đã được đăng ký', 400));
  }

  // Clean up any pending users with same email
  const oldPendingUser = await User.findOne({ email, status: 'chờ xác thực' });
  if (oldPendingUser) {
    await User.findByIdAndDelete(oldPendingUser._id);
  }

  // Create user with pending status
  const otp = generateOTP();
  const otp_expired = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const user = new User({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: role || 'Developer', // Default to 'Developer' for new users
    phoneNumber: phoneNumber?.trim(),
    gender,
    status: 'chờ xác thực', // Pending verification
    is_mfa_enabled: true, // MFA is mandatory
    mfa_type: 'email',
    otp_code: otp,
    otp_expired: otp_expired,
    otp_attempts: 0,
  });

  await user.save();

  try {
    await sendOTP(user.email, otp);
  } catch (emailError) {
    console.error('OTP sending failed:', emailError);
    return next(AppError('Không thể gửi mã xác thực. Vui lòng thử lại.', 500));
  }

  res.status(201).json({
    message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
    userId: user._id,
  });
});

// Login user - Check MFA status
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Enhanced email validation for workflow
  if (!email || !password) {
    return next(AppError('Vui lòng nhập đầy đủ email và mật khẩu', 400));
  }

  // Find user by email (case insensitive)
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return next(AppError('Email hoặc mật khẩu không đúng', 400));
  }

  // Check account status first
  if (user.status === 'chờ xác thực') {
    return next(AppError('Tài khoản chưa được xác thực. Vui lòng liên hệ quản trị viên.', 403));
  }

  if (user.status === 'bị khóa') {
    return next(AppError('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', 403));
  }

  // Check password with workflow-compliant error handling
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(AppError('Email hoặc mật khẩu không đúng', 400));
  }

  // Check if MFA is enabled
  if (user.is_mfa_enabled && user.mfa_type === 'email') {
    // Send OTP for MFA
    const otp = generateOTP();
    const otp_expired = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.otp_code = otp;
    user.otp_expired = otp_expired;
    user.otp_attempts = 0;
    await user.save();

    try {
      await sendOTP(user.email, otp);
    } catch (emailError) {
      console.error('OTP sending failed:', emailError);
      return next(AppError('Không thể gửi mã xác thực. Vui lòng thử lại.', 500));
    }

    return res.status(200).json({
      message: 'Vui lòng kiểm tra email để lấy mã OTP xác thực đăng nhập.',
      mfa: true,
      userId: user._id,
      nextStep: 'verify_otp'
    });
  }

  // Direct login without OTP
  const accessToken = await createAccessToken(user);
  const refreshToken = await createRefreshToken(user);
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.otp_code;
  delete userResponse.otp_expired;
  delete userResponse.otp_attempts;

  res.json({
    message: 'Đăng nhập thành công',
    accessToken,
    refreshToken,
    user: userResponse,
  });
});

// Xác thực OTP - Updated for workflow compliance
exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { userId, otp } = req.body;

  // Enhanced validation for workflow
  if (!userId || !otp) {
    return next(AppError('Vui lòng nhập đầy đủ userId và mã OTP', 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(AppError('Không tìm thấy tài khoản người dùng', 404));
  }

  // Workflow: Clean up expired pending users
  const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
  await User.deleteMany({
    status: 'chờ xác thực',
    createdAt: { $lt: expiredTime }
  });

  // Check account status
  if (user.status === 'bị khóa') {
    return next(AppError('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', 403));
  }

  // For registration verification (pending users)
  if (user.status === 'chờ xác thực') {
    if (!user.otp_code || !user.otp_expired) {
      return next(AppError('Mã OTP chưa được gửi hoặc đã hết hạn. Vui lòng yêu cầu gửi lại.', 400));
    }

    // Check OTP validity
    if (user.otp_code !== otp.trim()) {
      await handleOTPAttempts(user);
      return next(AppError('Mã OTP không đúng', 400));
    }

    if (new Date() > user.otp_expired) {
      await handleOTPAttempts(user);
      return next(AppError('Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.', 400));
    }

    // Activate account
    user.status = 'hoạt động';
    user.otp_code = null;
    user.otp_expired = null;
    user.otp_attempts = 0;
    await user.save();
    
    const accessToken = await createAccessToken(user);
    const refreshToken = await createRefreshToken(user);
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.otp_code;
    delete userResponse.otp_expired;
    delete userResponse.otp_attempts;

    res.json({
      message: 'Tài khoản đã được kích hoạt và đăng nhập thành công!',
      accessToken,
      refreshToken,
      user: userResponse,
    });
  } 
  // For login with MFA (active users with MFA enabled)
  else if (user.is_mfa_enabled && user.mfa_type === 'email') {
    if (!user.otp_code || !user.otp_expired) {
      return next(AppError('Mã OTP chưa được gửi hoặc đã hết hạn. Vui lòng yêu cầu gửi lại.', 400));
    }

    // Check OTP validity
    if (user.otp_code !== otp.trim()) {
      await handleOTPAttempts(user);
      return next(AppError('Mã OTP không đúng', 400));
    }

    if (new Date() > user.otp_expired) {
      await handleOTPAttempts(user);
      return next(AppError('Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.', 400));
    }

    // Clear OTP and login
    user.otp_code = null;
    user.otp_expired = null;
    user.otp_attempts = 0;
    await user.save();
    
    const accessToken = await createAccessToken(user);
    const refreshToken = await createRefreshToken(user);
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.otp_code;
    delete userResponse.otp_expired;
    delete userResponse.otp_attempts;

    res.json({
      message: 'Xác thực thành công và đăng nhập thành công!',
      accessToken,
      refreshToken,
      user: userResponse,
    });
  }
  else {
    return next(AppError(400, 'Yêu cầu không hợp lệ'));
  }
});

// Bật 2FA
exports.enable2FA = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(AppError('Không tìm thấy user', 404));
  user.is_mfa_enabled = true;
  user.mfa_type = 'email';
  await user.save();
  res.json({ message: 'Đã bật xác minh 2 lớp (2FA) qua email.' });
});

// Tắt 2FA
exports.disable2FA = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(AppError('Không tìm thấy user', 404));
  user.is_mfa_enabled = false;
  user.mfa_type = undefined;
  user.otp_code = undefined;
  user.otp_expired = undefined;
  user.otp_attempts = 0;
  await user.save();
  res.json({ message: 'Đã tắt xác minh 2 lớp (2FA).' });
});

// Gửi lại OTP (cho cả user pending và user active có 2FA)
exports.resendOTP = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  // Tìm user pending
  let user = await User.findOne({ email, status: 'chờ xác thực' });
  if (!user) {
    // Nếu không có user pending, tìm user active có 2FA
    user = await User.findOne({ email, status: 'hoạt động', is_mfa_enabled: true });
  }
  if (!user) {
    return next(AppError('Không tìm thấy tài khoản đang chờ xác thực hoặc đang bật 2FA', 404));
  }
  // Tạo OTP mới
  const otp = generateOTP();
  const otp_expired = new Date(Date.now() + 5 * 60 * 1000);
  user.otp_code = otp;
  user.otp_expired = otp_expired;
  user.otp_attempts = 0;
  await user.save();
  // Gửi OTP mới
  try {
    await sendOTP(user.email, otp);
  } catch (emailError) {
    return next(AppError('Không thể gửi email OTP. Vui lòng thử lại.', 500));
  }
  res.json({
    message: 'Đã gửi lại mã OTP, vui lòng kiểm tra email.',
    userId: user._id
  });
});

// Endpoint: refresh token
exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Thiếu refreshToken' });
  }
  let decoded;
  try {
    const verifyOptions = {};
    if (process.env.JWT_AUDIENCE) verifyOptions.audience = process.env.JWT_AUDIENCE;
    if (process.env.JWT_ISSUER) verifyOptions.issuer = process.env.JWT_ISSUER;
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET, verifyOptions);
  } catch (err) {
    return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
  }
  // Có thể kiểm tra thêm user tồn tại, trạng thái active...
  const user = await require('../models/User').findById(decoded._id);
  if (!user) {
    return res.status(404).json({ message: 'Không tìm thấy user' });
  }
  const accessToken = await createAccessToken(user);
  res.json({ accessToken });
});

// Get current user
exports.getCurrentUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) {
    return next(AppError('Không tìm thấy người dùng', 404));
  }
  res.json(user);
}); 
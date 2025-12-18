const User = require('../models/User');
const { createError: AppError } = require('../utils/error');
const catchAsync = require('../utils/catchAsync');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');

// Lấy tất cả người dùng
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const query = {};
  if (req.query.role) {
    query.role = req.query.role;
  }
  if (req.query.userID) {
    query.userID = req.query.userID;
  }
  const users = await User.find(query).select('-password');
  res.json(users);
});

// Lấy tất cả email đã đăng ký
exports.getAllUserEmails = catchAsync(async (req, res, next) => {
  const users = await User.find().select('email name role userID');
  res.json(users);
});

// Lấy người dùng theo ID hoặc userID
exports.getUser = catchAsync(async (req, res, next) => {
  let user;
  // Kiểm tra xem id có phải là MongoDB ObjectId không
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    user = await User.findById(req.params.id).select('-password');
  } else {
    // Nếu không, tìm kiếm theo userID
    user = await User.findOne({ userID: req.params.id }).select('-password');
  }
  
  if (!user) {
    return next(AppError('Không tìm thấy người dùng', 404));
  }
  res.json(user);
});

// Cập nhật người dùng theo ID
exports.updateUser = catchAsync(async (req, res, next) => {
  // Chỉ cho phép chính user sửa
  if (req.user.role !== 'PM' && req.user._id.toString() !== req.params.id) {
    return next(AppError('Bạn không có quyền sửa thông tin user này.', 403));
  }

  let updateFields = {};
  const { name, role, gender, email, phoneNumber, status } = req.body;

  // Nếu là PM, cho phép cập nhật tất cả các trường
  if (req.user.role === 'PM') {
    updateFields = { name, gender, email, phoneNumber };
    // Chỉ cho phép PM đổi status
    if (typeof status !== 'undefined') {
      updateFields.status = status;
    }
    // Chỉ cho phép PM đổi role
    if (typeof role !== 'undefined') {
      updateFields.role = role;
    }
  } else {
    // User thường chỉ được đổi thông tin cá nhân
    updateFields = { name, gender, email, phoneNumber };
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(AppError('Người dùng không tồn tại', 404));
  }
  res.json(user);
});


// Đổi mật khẩu
exports.changePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword) {
    return next(AppError('Mật khẩu mới là bắt buộc.', 400));
  }
  // Chỉ chính user đó mới được đổi mật khẩu
  if (req.user._id.toString() !== req.params.id) {
    return next(AppError(403, 'Bạn không có quyền đổi mật khẩu cho người dùng này.'));
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(AppError('Không tìm thấy người dùng.', 404));
  }
  // Nếu là đổi mật khẩu của chính mình thì phải kiểm tra oldPassword
  if (req.user._id.toString() === req.params.id) {
    const isMatch = await user.comparePassword(oldPassword || '');
    if (!isMatch) {
      return next(AppError(400, 'Mật khẩu cũ không đúng.'));
    }
  }
  // Nếu PM đổi mật khẩu cho người khác thì không cần kiểm tra oldPassword
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Đổi mật khẩu thành công.' });
});


// Cập nhật ảnh đại diện người dùng
exports.updateAvatar = catchAsync(async (req, res, next) => {
  // Ủy quyền: Cho phép chính người dùng cập nhật ảnh đại diện
  if (req.user._id.toString() !== req.params.id) { // Đã sửa ở các bước trước, giữ nguyên
    return next(AppError('Bạn không có quyền cập nhật ảnh đại diện cho người dùng này.', 403));
  }

  if (!req.file) {
    return next(AppError('Vui lòng tải lên một tệp.', 400));
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(AppError('Không tìm thấy người dùng.', 404));
  }

  // Xóa ảnh cũ trên Cloudinary nếu có
  if (user.avatarUrl) {
    const matches = user.avatarUrl.match(/project_files\/([^\.\/]+)\./);
    if (matches && matches[1]) {
      const publicId = `project_files/${matches[1]}`;
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      } catch (err) {
        console.error('Không thể xóa ảnh cũ trên Cloudinary:', err);
      }
    }
  }

  // Cập nhật đường dẫn ảnh đại diện mới từ Cloudinary
  user.avatarUrl = req.file.path;
  await user.save();

  res.json({
    message: 'Cập nhật ảnh đại diện thành công.',
    avatarUrl: user.avatarUrl,
  });
});


// GET /api/users/check-id/:userID - Kiểm tra xem userID có tồn tại và trả về tên người dùng
exports.checkUserId = catchAsync(async (req, res, next) => {
  const userID = req.params.userID;

  if (!userID) {
    return next(AppError('UserID is required', 400));
  }

  const user = await User.findOne({ userID: userID }).select('name');

  if (user) {
    res.json({ name: user.name });
  } else {
    return next(AppError('Người dùng không tồn tại.', 404));
  }
});

// Search users theo name hoặc email (authenticated users)
exports.searchUsers = catchAsync(async (req, res, next) => {
  const q = req.query.q || '';

  // Nếu query rỗng hoặc quá ngắn, trả về danh sách users (giới hạn 20)
  if (!q || q.trim().length < 2) {
    const users = await User.find({})
    .select('name email role userID')
    .limit(20)
    .sort({ name: 1 });
    return res.json(users);
  }

  // Search với query
  const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, ''), 'i');
  const users = await User.find({
    $or: [{ name: regex }, { email: regex }, { userID: regex }]
  })
  .select('name email role userID')
  .limit(20)
  .sort({ name: 1 });

  res.json(users);
});

// Tạo user mới
exports.createUser = catchAsync(async (req, res, next) => {
  const { userID, name, email, password, role, phoneNumber } = req.body;
  const existingUser = await User.findOne({ $or: [{ userID }, { email }] });
  if (existingUser) {
    return next(AppError('UserID hoặc email đã tồn tại.', 400));
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    userID,
    name,
    email,
    password: hashedPassword,
    role: role || 'Developer',
    phoneNumber
  });
  await user.save();
  res.status(201).json({ message: 'User created successfully', user: { userID: user.userID, name: user.name, email: user.email, role: user.role } });
});

// Cập nhật role của user
exports.updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  if (!role) {
    return next(AppError('Role is required.', 400));
  }
  // Chỉ PM mới có quyền cập nhật role của user
  if (req.user.role !== 'PM') {
    return next(AppError('Bạn không có quyền cập nhật role của người dùng.', 403));
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(AppError(404, 'User not found'));
  }
  user.role = role;
  await user.save();
  res.json({ message: 'User role updated successfully', user: { userID: user.userID, name: user.name, email: user.email, role: user.role } });
});

// Bật xác thực 2 lớp
exports.enable2FA = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(AppError(404, 'User not found'));
  if (user.is_mfa_enabled) return res.status(200).json({ message: '2FA đã được bật.' });
  user.is_mfa_enabled = true;
  await user.save();
  res.status(200).json({ message: 'Đã bật xác thực 2 lớp (2FA).' });
});

// Tắt xác thực 2 lớp
exports.disable2FA = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(AppError(404, 'User not found'));
  if (!user.is_mfa_enabled) return res.status(200).json({ message: '2FA đã tắt sẵn.' });
  user.is_mfa_enabled = false;
  await user.save();
  res.status(200).json({ message: 'Đã tắt xác thực 2 lớp (2FA).' });
});

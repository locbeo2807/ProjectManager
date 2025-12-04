const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Hàm tạo số ngẫu nhiên 8 chữ số
const generateUserID = async () => {
  let userID;
  let isUnique = false;
  
  while (!isUnique) {
    // Tạo số ngẫu nhiên 8 chữ số
    userID = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Kiểm tra userID đã tồn tại chưa
    const existingUser = await mongoose.model('User').findOne({ userID });
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  return userID;
};

const userSchema = new mongoose.Schema(
  {
    userID: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['PM', 'BA', 'Developer', 'QA Tester', 'QC', 'Scrum Master', 'DevOps Engineer', 'Product Owner'],
      default: 'Developer',
    },
    phoneNumber: {
      type: String,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    avatar: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['hoạt động', 'bị khóa', 'chờ xác thực'],
      default: 'hoạt động',
    },
    is_mfa_enabled: {
      type: Boolean,
      default: false,
    },
    mfa_type: {
      type: String,
      enum: ['email'],
    },
    otp_code: {
      type: String,
    },
    otp_expired: {
      type: Date,
    },
    otp_attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Tạo userID trước khi xác thực
userSchema.pre('validate', async function (next) {
  if (this.isNew && !this.userID) {
    this.userID = await generateUserID();
  }
  next();
});

// Mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Phương thức so sánh mật khẩu
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 
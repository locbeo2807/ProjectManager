const mongoose = require('mongoose');

const TechnicalDebtSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['Code Quality', 'Architecture', 'Performance', 'Security', 'Documentation', 'Testing', 'Dependencies'],
    required: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: function() {
      // Tự động tính ưu tiên dựa trên mức độ nghiêm trọng
      const priorities = { 'Low': 'Low', 'Medium': 'Medium', 'High': 'High', 'Critical': 'Urgent' };
      return priorities[this.severity] || 'Medium';
    }
  },
  status: {
    type: String,
    enum: ['Đã xác định', 'Đã lên kế hoạch', 'Đang thực hiện', 'Đã giải quyết', 'Đã hủy'],
    default: 'Đã xác định'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  estimatedEffort: {
    type: Number, // giờ
    min: 0
  },
  actualEffort: {
    type: Number, // giờ
    min: 0
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },
  sprint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint'
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  impact: {
    type: String,
    trim: true
  },
  solution: {
    type: String,
    trim: true
  },
  prevention: {
    type: String,
    trim: true
  },
  recurring: {
    type: Boolean,
    default: false
  },
  frequency: {
    type: String,
    enum: ['One-time', 'Weekly', 'Monthly', 'Quarterly'],
    default: 'One-time'
  }
}, {
  timestamps: true
});

// Chỉ mục để tối ưu hiệu suất
TechnicalDebtSchema.index({ project: 1, status: 1 });
TechnicalDebtSchema.index({ assignedTo: 1 });
TechnicalDebtSchema.index({ priority: 1 });
TechnicalDebtSchema.index({ type: 1 });
TechnicalDebtSchema.index({ severity: 1 });

// Virtual cho điểm nợ (mức độ nghiêm trọng * nỗ lực ước tính)
TechnicalDebtSchema.virtual('debtScore').get(function() {
  const severityScore = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }[this.severity] || 1;
  return severityScore * (this.estimatedEffort || 1);
});

// Middleware pre-save để cập nhật ưu tiên và xử lý giải quyết
TechnicalDebtSchema.pre('save', function(next) {
  // Cập nhật ưu tiên dựa trên mức độ nghiêm trọng
  if (this.isModified('severity')) {
    const priorities = { 'Low': 'Low', 'Medium': 'Medium', 'High': 'High', 'Critical': 'Urgent' };
    this.priority = priorities[this.severity] || 'Medium';
  }

  // Xử lý giải quyết
  if (this.isModified('status') && this.status === 'Đã giải quyết' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }

  next();
});

// Method để populate details
TechnicalDebtSchema.methods.populateDetails = function() {
  return this.populate([
    { path: 'project', select: 'name projectId' },
    { path: 'module', select: 'name moduleId' },
    { path: 'sprint', select: 'name' },
    { path: 'task', select: 'name taskId' },
    { path: 'assignedTo', select: 'name email userID' },
    { path: 'createdBy', select: 'name email' },
    { path: 'resolvedBy', select: 'name email' }
  ]);
};

// Phương thức tĩnh để lấy thống kê nợ kỹ thuật
TechnicalDebtSchema.statics.getDebtStats = function(projectId) {
  return this.aggregate([
    { $match: { project: mongoose.Types.ObjectId(projectId) } },
    {
      $group: {
        _id: null,
        totalDebt: { $sum: 1 },
        resolvedDebt: {
          $sum: { $cond: [{ $eq: ['$status', 'Đã giải quyết'] }, 1, 0] }
        },
        criticalDebt: {
          $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] }
        },
        totalEstimatedEffort: { $sum: '$estimatedEffort' },
        totalActualEffort: { $sum: '$actualEffort' }
      }
    }
  ]);
};

// Phương thức instance để tính hiệu quả
TechnicalDebtSchema.methods.getEfficiency = function() {
  if (!this.estimatedEffort || !this.actualEffort) return null;
  return (this.estimatedEffort / this.actualEffort) * 100;
};

module.exports = mongoose.model('TechnicalDebt', TechnicalDebtSchema);
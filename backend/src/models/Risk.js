const mongoose = require('mongoose');

const RiskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  impact: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: true
  },
  likelihood: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: function() {
      // Tự động tính ưu tiên dựa trên tác động và khả năng xảy ra
      const impactScore = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }[this.impact] || 1;
      const likelihoodScore = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }[this.likelihood] || 1;
      const totalScore = impactScore * likelihoodScore;

      if (totalScore >= 12) return 'Critical';
      if (totalScore >= 6) return 'High';
      if (totalScore >= 3) return 'Medium';
      return 'Low';
    }
  },
  status: {
    type: String,
    enum: ['Đã xác định', 'Đã đánh giá', 'Đã giảm thiểu', 'Đã đóng', 'Đã chấp nhận'],
    default: 'Đã xác định'
  },
  riskType: {
    type: String,
    enum: ['Technical', 'Business', 'Operational', 'Security', 'Compliance', 'Resource', 'Schedule', 'Quality'],
    default: 'Technical'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mitigationPlan: {
    type: String,
    trim: true
  },
  mitigationDeadline: {
    type: Date
  },
  actualResolutionDate: {
    type: Date
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },
  sprint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  cost: {
    estimated: { type: Number, min: 0 },
    actual: { type: Number, min: 0 }
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: function() {
      // Chuyển đổi khả năng xảy ra thành tỷ lệ phần trăm xác suất
      const probabilities = { 'Low': 25, 'Medium': 50, 'High': 75, 'Critical': 90 };
      return probabilities[this.likelihood] || 50;
    }
  }
}, {
  timestamps: true
});

// Chỉ mục để tối ưu hiệu suất
RiskSchema.index({ project: 1, status: 1 });
RiskSchema.index({ assignedTo: 1 });
RiskSchema.index({ priority: 1 });
RiskSchema.index({ riskType: 1 });

// Virtual cho điểm rủi ro (tác động * khả năng xảy ra * xác suất)
RiskSchema.virtual('riskScore').get(function() {
  const impactScore = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }[this.impact] || 1;
  const likelihoodScore = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }[this.likelihood] || 1;
  return impactScore * likelihoodScore * (this.probability / 100);
});

// Middleware pre-save để cập nhật ưu tiên
RiskSchema.pre('save', function(next) {
  // Tính lại ưu tiên khi tác động hoặc khả năng xảy ra thay đổi
  if (this.isModified('impact') || this.isModified('likelihood')) {
    const impactScore = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }[this.impact] || 1;
    const likelihoodScore = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 }[this.likelihood] || 1;
    const totalScore = impactScore * likelihoodScore;

    if (totalScore >= 12) this.priority = 'Critical';
    else if (totalScore >= 6) this.priority = 'High';
    else if (totalScore >= 3) this.priority = 'Medium';
    else this.priority = 'Low';
  }

  // Cập nhật xác suất dựa trên khả năng xảy ra
  if (this.isModified('likelihood')) {
    const probabilities = { 'Low': 25, 'Medium': 50, 'High': 75, 'Critical': 90 };
    this.probability = probabilities[this.likelihood] || 50;
  }

  next();
});

// Method to populate details
RiskSchema.methods.populateDetails = function() {
  return this.populate([
    { path: 'project', select: 'name projectId' },
    { path: 'task', select: 'name taskId' },
    { path: 'module', select: 'name moduleId' },
    { path: 'sprint', select: 'name' },
    { path: 'assignedTo', select: 'name email userID' },
    { path: 'createdBy', select: 'name email' }
  ]);
};

// Phương thức tĩnh để lấy thống kê rủi ro
RiskSchema.statics.getRiskStats = function(projectId) {
  return this.aggregate([
    { $match: { project: mongoose.Types.ObjectId(projectId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgRiskScore: { $avg: { $multiply: ['$impact', '$likelihood'] } }
      }
    }
  ]);
};

module.exports = mongoose.model('Risk', RiskSchema);
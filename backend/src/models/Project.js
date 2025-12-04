const mongoose = require('mongoose');

const ProjectHistorySchema = new mongoose.Schema({
  action: { type: String, required: false }, // Giữ lại để tương thích, nhưng không ghi mới
  description: { type: String, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false }, // Cờ đánh dấu log chính
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
});

const ProjectSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  version: { type: String },
  status: {
    type: String,
    enum: ['Khởi tạo', 'Đang triển khai', 'Hoàn thành'],
    default: 'Khởi tạo'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Người phụ trách project
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  progress: { type: Number, default: 0, min: 0, max: 100 }, // Percentage 0-100
  // Theo dõi tiến độ nâng cao
  totalModules: { type: Number, default: 0 },
  completedModules: { type: Number, default: 0 },
  totalTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  totalStoryPoints: { type: Number, default: 0 },
  completedStoryPoints: { type: Number, default: 0 },
  // Chỉ số sức khỏe dự án
  velocity: { type: Number, default: 0 }, // Average story points per sprint
  defectDensity: { type: Number, default: 0 }, // bugs per story point
  teamSatisfaction: { type: Number, default: 0, min: 0, max: 100 }, // NPS style
  // Chỉ số rủi ro và chất lượng
  totalRisks: { type: Number, default: 0 },
  criticalRisks: { type: Number, default: 0 },
  openRisks: { type: Number, default: 0 },
  technicalDebtItems: { type: Number, default: 0 },
  // Theo dõi ngân sách và thời gian
  budget: {
    estimated: { type: Number, min: 0 },
    actual: { type: Number, min: 0 },
    currency: { type: String, default: 'VND' }
  },
  timeline: {
    plannedEndDate: { type: Date },
    forecastedEndDate: { type: Date },
    delayDays: { type: Number, default: 0 }
  },
  files: [{
    url: String, // Cloudinary url
    publicId: String, // Cloudinary public_id
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  history: [ProjectHistorySchema]
}, { timestamps: true });

// Chỉ mục để tối ưu hiệu suất
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ 'members.user': 1 });

// Middleware pre-save để tự động tính tiến độ và trạng thái
ProjectSchema.pre('save', async function(next) {
  try {
    // Tự động tính tiến độ và trạng thái dựa trên module
    if (this.isModified('status') || this.isNew) {
      await this.calculateProgress();
      await this.updateStatusFromModules();
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Phương thức instance để tính tiến độ dự án
ProjectSchema.methods.calculateProgress = async function() {
  try {
    const Module = mongoose.model('Module');
    const modules = await Module.find({ project: this._id });

    this.totalModules = modules.length;
    this.completedModules = modules.filter(module => module.status === 'Hoàn thành').length;

    // Tổng hợp dữ liệu nhiệm vụ từ tất cả module
    this.totalTasks = modules.reduce((sum, module) => sum + (module.totalTasks || 0), 0);
    this.completedTasks = modules.reduce((sum, module) => sum + (module.completedTasks || 0), 0);
    this.totalStoryPoints = modules.reduce((sum, module) => sum + (module.totalStoryPoints || 0), 0);
    this.completedStoryPoints = modules.reduce((sum, module) => sum + (module.completedStoryPoints || 0), 0);

    // Tính tiến độ tổng thể
    if (this.totalModules > 0) {
      this.progress = Math.round((this.completedModules / this.totalModules) * 100);
    } else {
      this.progress = 0;
    }

    // Tính mật độ khuyết tật trên tất cả module
    const totalDefects = modules.reduce((sum, module) => sum + (module.defectDensity * module.totalStoryPoints || 0), 0);
    this.defectDensity = this.totalStoryPoints > 0 ? totalDefects / this.totalStoryPoints : 0;

    // Cập nhật số lượng rủi ro và nợ kỹ thuật
    const Risk = mongoose.model('Risk');
    const TechnicalDebt = mongoose.model('TechnicalDebt');

    const risks = await Risk.find({ project: this._id });
    this.totalRisks = risks.length;
    this.criticalRisks = risks.filter(risk => risk.priority === 'Critical').length;
    this.openRisks = risks.filter(risk => !['Closed', 'Accepted'].includes(risk.status)).length;

    const technicalDebts = await TechnicalDebt.find({ project: this._id });
    this.technicalDebtItems = technicalDebts.length;

  } catch (error) {
    console.error('Error calculating project progress:', error);
  }
};

// Phương thức instance để cập nhật trạng thái dự án dựa trên module
ProjectSchema.methods.updateStatusFromModules = async function() {
  try {
    const Module = mongoose.model('Module');
    const modules = await Module.find({ project: this._id });

    if (modules.length === 0) {
      this.status = 'Khởi tạo';
      return;
    }

    const completedModules = modules.filter(module => module.status === 'Hoàn thành').length;
    const developingModules = modules.filter(module => module.status === 'Đang phát triển').length;

    if (completedModules === modules.length) {
      this.status = 'Hoàn thành';
    } else if (developingModules > 0 || completedModules > 0) {
      this.status = 'Đang triển khai';
    } else {
      this.status = 'Khởi tạo';
    }

  } catch (error) {
    console.error('Error updating project status:', error);
  }
};

// Virtual cho điểm sức khỏe dự án
ProjectSchema.virtual('healthScore').get(function() {
  let score = this.progress; // Base score from progress

  // Phạt cho mật độ khuyết tật cao
  if (this.defectDensity > 0.5) score -= 30;
  else if (this.defectDensity > 0.2) score -= 15;

  // Phạt cho rủi ro nghiêm trọng
  if (this.criticalRisks > 0) score -= 20;

  // Phạt cho nợ kỹ thuật cao
  if (this.technicalDebtItems > 10) score -= 15;
  else if (this.technicalDebtItems > 5) score -= 10;

  // Thưởng cho vận tốc cao
  if (this.velocity > 20) score += 10;

  return Math.max(0, Math.min(100, score));
});

// Virtual cho hiệu quả ngân sách
ProjectSchema.virtual('budgetEfficiency').get(function() {
  if (!this.budget.estimated || !this.budget.actual) return null;
  return (this.budget.estimated / this.budget.actual) * 100;
});

// Virtual cho hiệu quả lịch trình
ProjectSchema.virtual('scheduleEfficiency').get(function() {
  if (!this.endDate || !this.timeline.forecastedEndDate) return null;

  const plannedDuration = this.endDate - this.startDate;
  const actualDuration = this.timeline.forecastedEndDate - this.startDate;

  return (plannedDuration / actualDuration) * 100;
});

// Phương thức tĩnh để lấy thống kê dự án
ProjectSchema.statics.getProjectStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progress' },
        totalProjects: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Project', ProjectSchema);
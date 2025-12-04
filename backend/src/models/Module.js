const mongoose = require('mongoose');

const ModuleHistorySchema = new mongoose.Schema({
  action: { type: String, required: false },
  description: { type: String, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false },
});

const ModuleSchema = new mongoose.Schema({
  moduleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  files: [{
    url: String, // URL Cloudinary
    publicId: String, // public_id Cloudinary
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  version: { type: String },
  status: {
    type: String,
    enum: ['Proposed', 'Approved', 'Active', 'Ready for Release', 'Released', 'Maintained', 'Archived', 'Chưa phát triển', 'Đang phát triển', 'Hoàn thành'],
    default: 'Proposed'
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  progress: { type: Number, default: 0, min: 0, max: 100 }, // Percentage 0-100
  // Theo dõi tiến độ nâng cao
  totalTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  totalStoryPoints: { type: Number, default: 0 },
  completedStoryPoints: { type: Number, default: 0 },
  // Chỉ số chất lượng
  defectDensity: { type: Number, default: 0 }, // bugs per story point
  codeCoverage: { type: Number, default: 0, min: 0, max: 100 },
  // Rủi ro và nợ kỹ thuật
  associatedRisks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Risk' }],
  technicalDebt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TechnicalDebt' }],
  // Epic
  epics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Epic' }],
  history: [ModuleHistorySchema]
}, { timestamps: true });

// Chỉ mục để tối ưu hiệu suất
ModuleSchema.index({ project: 1, status: 1 });
ModuleSchema.index({ owner: 1 });

// Middleware pre-save để tự động tính tiến độ
ModuleSchema.pre('save', async function(next) {
  try {
    // Tự động tính tiến độ dựa trên nhiệm vụ nếu không được đặt thủ công
    if (this.isModified('status') || this.isNew) {
      await this.calculateProgress();
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Phương thức instance để tính tiến độ
ModuleSchema.methods.calculateProgress = async function() {
  try {
    const Task = mongoose.model('Task');
    const Sprint = mongoose.model('Sprint');

    // Tìm tất cả sprint thuộc module này
    const sprints = await Sprint.find({ module: this._id });
    const sprintIds = sprints.map(s => s._id);

    // Và tất cả task thuộc các sprint đó
    const tasks = await Task.find({ sprint: { $in: sprintIds } });

    this.totalTasks = tasks.length;
    this.completedTasks = tasks.filter(task =>
      task.status === 'Done' && task.reviewStatus === 'Đạt'
    ).length;

    this.totalStoryPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
    this.completedStoryPoints = tasks
      .filter(task => task.status === 'Done' && task.reviewStatus === 'Đạt')
      .reduce((sum, task) => sum + (task.storyPoints || 0), 0);

    // Tính tỷ lệ tiến độ
    if (this.totalTasks > 0) {
      this.progress = Math.round((this.completedTasks / this.totalTasks) * 100);
    } else {
      // Nếu không có nhiệm vụ, dựa tiến độ trên trạng thái
      const statusProgress = {
        'Proposed': 0,
        'Approved': 0,
        'Active': 50,
        'Ready for Release': 90,
        'Released': 100,
        'Maintained': 100,
        'Archived': 100
      };
      this.progress = statusProgress[this.status] || 0;
    }

    // Tính mật độ khuyết tật
    const bugs = tasks.filter(task => task.taskType === 'Bug');
    this.defectDensity = this.totalStoryPoints > 0 ? (bugs.length / this.totalStoryPoints) : 0;

  } catch (error) {
    console.error('Error calculating module progress:', error);
  }
};

// Virtual cho điểm sức khỏe (kết hợp tiến độ, mật độ khuyết tật, v.v.)
ModuleSchema.virtual('healthScore').get(function() {
  let score = this.progress; // Base score from progress

  // Phạt cho mật độ khuyết tật cao
  if (this.defectDensity > 0.5) score -= 20;
  else if (this.defectDensity > 0.2) score -= 10;

  // Thưởng cho độ phủ mã cao
  if (this.codeCoverage > 80) score += 10;
  else if (this.codeCoverage < 50) score -= 10;

  return Math.max(0, Math.min(100, score));
});

// Phương thức tĩnh để cập nhật tiến độ tất cả module trong dự án
ModuleSchema.statics.updateProjectModulesProgress = async function(projectId) {
  const modules = await this.find({ project: projectId });
  for (const module of modules) {
    await module.calculateProgress();
    await module.save();
  }
};

module.exports = mongoose.model('Module', ModuleSchema);
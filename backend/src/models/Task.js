const mongoose = require('mongoose');

const TaskHistorySchema = new mongoose.Schema({
  action: { type: String, required: false },
  description: { type: String, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false },
});

const TaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  goal: { type: String },
  taskType: {
    type: String,
    enum: ['Feature', 'Bug', 'Improvement', 'Research/Spike'],
    default: 'Feature'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['Hàng đợi', 'Chưa làm', 'Đang làm', 'Đang xem xét', 'Kiểm thử QA', 'Sẵn sàng phát hành', 'Hoàn thành', 'Mới', 'Đang xác nhận', 'Đang sửa', 'Kiểm thử lại', 'Đã đóng'],
    default: 'Hàng đợi'
  },
  reviewStatus: {
    type: String,
    enum: ['Chưa', 'Đạt', 'Không đạt'],
    default: 'Chưa'
  },
  priority: {
    type: String,
    enum: ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'],
    default: 'Trung bình'
  },
  storyPoints: { type: Number, min: 0 }, // Điểm story Agile
  estimatedHours: { type: Number, default: 0 }, // Dự kiến (giờ)
  actualHours: { type: Number, default: 0 }, // Thực tế (giờ)
  startDate: { type: Date }, // Ngày bắt đầu
  endDate: { type: Date }, // Ngày kết thúc
  deadline: { type: Date },
  // Các trường cụ thể cho bug
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  bugLifecycle: {
    reportedDate: { type: Date },
    confirmedDate: { type: Date },
    fixedDate: { type: Date },
    retestDate: { type: Date },
    closedDate: { type: Date }
  },
  timeLogs: [{
    date: { type: Date, default: Date.now },
    hours: { type: Number, required: true },
    description: { type: String },
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  epic: { type: mongoose.Schema.Types.ObjectId, ref: 'Epic' }, // Tùy chọn, nếu nhiệm vụ thuộc về epic
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // Cho nhiệm vụ con
  subtasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], // Nhiệm vụ con
  // Quy trình nghiệp vụ
  businessWorkflow: {
    baConfirmRequirement: { type: Boolean, default: false },
    baApproveUI: { type: Boolean, default: false },
    baAcceptFeature: { type: Boolean, default: false },
    poAcceptFeature: { type: Boolean, default: false } // Product Owner final acceptance
  },
  // Tiêu chí chấp nhận
  acceptanceCriteria: [{ type: String }],
  // Phụ thuộc
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  // Liên kết rủi ro và nợ kỹ thuật
  relatedRisks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Risk' }],
  relatedTechnicalDebt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TechnicalDebt' }],
  // Tích hợp Git (cải tiến tương lai)
  gitBranch: { type: String },
  gitCommit: { type: String },
  // Thông tin kiểm thử
  testCases: [{
    title: String,
    status: { type: String, enum: ['Pending', 'Pass', 'Fail'], default: 'Pending' },
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    executedAt: { type: Date }
  }],
  // Đính kèm và liên kết
  files: [{
    url: String, // Cloudinary url
    publicId: String, // Cloudinary public_id
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  // File hoàn thành (work files hoặc PDF review) - bắt buộc khi hoàn thành task
  completionFiles: [{
    url: String,
    publicId: String,
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    description: String, // Mô tả file (vd: "Báo cáo công việc hoàn thành", "File review PDF")
    reviewStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewComment: String // Feedback từ người review
  }],
  // Handover completion files - files uploaded during handover process
  handoverFiles: [{
    url: String,
    publicId: String,
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    description: String,
    handoverFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Người bàn giao
    handoverTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Người nhận bàn giao
    reviewStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewComment: String
  }],
  externalLinks: [{
    title: String,
    url: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  history: [TaskHistorySchema]
}, { timestamps: true });

// Chỉ mục để tối ưu hiệu suất
TaskSchema.index({ sprint: 1, status: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ reviewers: 1 });
TaskSchema.index({ epic: 1 });
TaskSchema.index({ taskType: 1 });
TaskSchema.index({ priority: 1 });

// Middleware pre-save cho cập nhật tự động
TaskSchema.pre('save', function(next) {
  // Theo dõi vòng đời bug
  if (this.taskType === 'Bug' && this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'Đang xác nhận':
        if (!this.bugLifecycle.confirmedDate) {
          this.bugLifecycle.confirmedDate = now;
        }
        break;
      case 'Đang sửa':
        if (!this.bugLifecycle.fixedDate) {
          this.bugLifecycle.fixedDate = now;
        }
        break;
      case 'Kiểm thử lại':
        if (!this.bugLifecycle.retestDate) {
          this.bugLifecycle.retestDate = now;
        }
        break;
      case 'Đã đóng':
        if (!this.bugLifecycle.closedDate) {
          this.bugLifecycle.closedDate = now;
        }
        break;
    }
  }

  // Đặt ngày báo cáo cho bug mới
  if (this.taskType === 'Bug' && this.isNew && !this.bugLifecycle.reportedDate) {
    this.bugLifecycle.reportedDate = new Date();
  }

  next();
});

// Virtual cho tỷ lệ hoàn thành nhiệm vụ
TaskSchema.virtual('completionPercentage').get(function() {
  if (!this.subtasks || this.subtasks.length === 0) {
    // Hoàn thành nhiệm vụ đơn lẻ dựa trên trạng thái
    const statusWeights = {
      'Hàng đợi': 0, 'Chưa làm': 10, 'Đang làm': 40,
      'Đang xem xét': 70, 'Kiểm thử QA': 85, 'Sẵn sàng phát hành': 95, 'Hoàn thành': 100,
      'Mới': 5, 'Đang xác nhận': 20, 'Đang sửa': 60, 'Kiểm thử lại': 80, 'Đã đóng': 100
    };
    return statusWeights[this.status] || 0;
  } else {
    // Nhiệm vụ với nhiệm vụ con - tính dựa trên hoàn thành nhiệm vụ con
    const completedSubtasks = this.subtasks.filter(subtask =>
      subtask.status === 'Hoàn thành'
    ).length;
    return this.subtasks.length > 0 ? (completedSubtasks / this.subtasks.length) * 100 : 0;
  }
});

// Phương thức tĩnh để lấy thống kê nhiệm vụ
TaskSchema.statics.getTaskStats = function(projectId) {
  return this.aggregate([
    { $match: { project: mongoose.Types.ObjectId(projectId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalStoryPoints: { $sum: '$storyPoints' }
      }
    }
  ]);
};

module.exports = mongoose.model('Task', TaskSchema);

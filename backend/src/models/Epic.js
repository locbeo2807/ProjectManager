const mongoose = require('mongoose');

const EpicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    default: 'Backlog'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  sprint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint'
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptanceCriteria: [{
    type: String,
    trim: true
  }],
  userStories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  estimatedEffort: {
    type: Number, // Điểm story
    min: 0
  },
  actualEffort: {
    type: Number, // Điểm story
    min: 0
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
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
  businessValue: {
    type: Number,
    min: 0,
    max: 100
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Low'
  }
}, {
  timestamps: true
});

// Chỉ mục để tối ưu hiệu suất
EpicSchema.index({ project: 1, status: 1 });
EpicSchema.index({ assignee: 1 });
EpicSchema.index({ sprint: 1 });

// Virtual cho tỷ lệ hoàn thành dựa trên user stories
EpicSchema.virtual('completionPercentage').get(function() {
  if (!this.userStories || this.userStories.length === 0) return 0;

  const completedStories = this.userStories.filter(story =>
    story.status === 'Done' && story.reviewStatus === 'Đạt'
  ).length;

  return Math.round((completedStories / this.userStories.length) * 100);
});

// Middleware pre-save để cập nhật tiến độ
EpicSchema.pre('save', function(next) {
  // Tự động tính tiến độ dựa trên user stories nếu không được đặt thủ công
  if (this.userStories && this.userStories.length > 0) {
    const completedStories = this.userStories.filter(story =>
      story.status === 'Done' && story.reviewStatus === 'Đạt'
    ).length;

    this.progress = Math.round((completedStories / this.userStories.length) * 100);
  }

  next();
});

// Method để populate details
EpicSchema.methods.populateDetails = function() {
  return this.populate([
    { path: 'project', select: 'name projectId' },
    { path: 'sprint', select: 'name' },
    { path: 'assignee', select: 'name email' },
    { path: 'createdBy', select: 'name email' }
  ]);
};

module.exports = mongoose.model('Epic', EpicSchema);
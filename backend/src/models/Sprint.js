const mongoose = require('mongoose');

const SprintHistorySchema = new mongoose.Schema({
  action: { type: String, required: false },
  description: { type: String, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
});

const SprintSchema = new mongoose.Schema({
  name: { type: String, required: true },
  goal: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành'],
    default: 'Chưa bắt đầu'
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String }
  }],
  // Quan hệ mới: Sprint thuộc về một Module (và từ đó suy ra Project)
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: false },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  files: [{
    url: String, // URL Cloudinary
    publicId: String, // public_id Cloudinary
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  repoLink: { type: String },
  gitBranch: { type: String },
  velocity: { type: Number, default: 0 }, // Tỷ lệ vận tốc sprint
  history: [SprintHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Sprint', SprintSchema);
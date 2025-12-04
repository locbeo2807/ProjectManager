const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // ví dụ: 'project', 'sprint', 'task', ...
  refId: { type: String }, // id liên quan (projectId, sprintId, ...)
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  deliveredAt: { type: Date }, // thời điểm backend đã emit notification tới client
  readAt: { type: Date }, // thời điểm user đánh dấu đã đọc
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema); 
const Notification = require('../models/Notification');

// Lấy danh sách thông báo của user
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || null;
    const limit = parseInt(req.query.limit, 10) || null;

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Notification.countDocuments({ user: req.user._id })
      ]);
      return res.json({ data: items, total, page, limit });
    }

    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy thông báo.' });
  }
};

// Đánh dấu tất cả thông báo là đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi đánh dấu đã đọc.' });
  }
};

// Đánh dấu một thông báo là đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi đánh dấu đã đọc.' });
  }
}; 

// Xóa một thông báo
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!notification) return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    res.json({ message: 'Đã xóa thông báo.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi xóa thông báo.' });
  }
};

// Xóa tất cả thông báo của user
exports.clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ message: 'Đã xóa tất cả thông báo.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi xóa thông báo.' });
  }
};

// Lấy số lượng thông báo chưa đọc
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy số lượng thông báo chưa đọc.' });
  }
};
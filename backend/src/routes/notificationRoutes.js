const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// Lấy danh sách thông báo
router.get('/', authenticate, notificationController.getNotifications);

// Lấy số lượng thông báo chưa đọc
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// Đánh dấu tất cả là đã đọc
// Đánh dấu tất cả là đã đọc
router.patch('/read', authenticate, notificationController.markAllAsRead);
router.put('/:id/read', authenticate, notificationController.markAsRead); // alias for PUT

// Xóa thông báo
router.delete('/:id', authenticate, notificationController.deleteNotification);

// Xóa tất cả thông báo
router.delete('/', authenticate, notificationController.clearNotifications);

// Đánh dấu một thông báo là đã đọc
// Đánh dấu một thông báo là đã đọc
router.patch('/:id/read', authenticate, notificationController.markAsRead);

module.exports = router; 
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const socketManager = require('../socket');

// Test notification endpoint
router.post('/test-notification', async (req, res) => {
  try {
    // Lấy user đầu tiên có role BA
    const baUser = await User.findOne({ role: 'BA' });
    if (!baUser) {
      return res.status(404).json({ message: 'Không tìm thấy user BA' });
    }

    console.log('Testing notification to BA:', baUser._id.toString());

    // Gửi test notification
    const testNotification = {
      _id: new Date().getTime(),
      message: `TEST NOTIFICATION: Bạn nhận được thông báo test lúc ${new Date().toLocaleTimeString('vi-VN')}`,
      type: 'test_notification',
      refId: 'test',
      createdAt: new Date()
    };

    socketManager.sendNotification(baUser._id.toString(), testNotification);
    
    console.log('Test notification sent to:', baUser.name, baUser.email);
    
    res.json({ 
      message: 'Test notification sent',
      user: baUser.name,
      userId: baUser._id.toString(),
      onlineUsers: Array.from(socketManager.onlineUsers?.keys() || [])
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check online users
router.get('/online-users', (req, res) => {
  const onlineUsers = socketManager.onlineUsers || new Map();
  res.json({
    onlineUserIds: Array.from(onlineUsers.keys()),
    count: onlineUsers.size
  });
});

module.exports = router;

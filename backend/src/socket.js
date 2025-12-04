const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Notification = require('./models/Notification');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

// Lưu userId <-> Set(socketId) mapping để hỗ trợ nhiều thiết bị
const onlineUsers = new Map();
// Guard set để tránh deliver pending notifications nhiều lần cùng lúc cho cùng 1 user
const deliveringUsers = new Set();

const socketManager = {
  io: null,
  
  setupSocket(server) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error'));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      // Đảm bảo userId luôn là string
      const userId = socket.user._id.toString();

      // Lưu mapping userId -> Set(socketId)
      const existing = onlineUsers.get(userId);
      if (existing) {
        existing.add(socket.id);
      } else {
        onlineUsers.set(userId, new Set([socket.id]));
      }

      // Khi user kết nối, gửi các notification chưa đọc được lưu khi họ offline
      (async () => {
        if (deliveringUsers.has(userId)) {
          // Có 1 luồng đang deliver cho user này, bỏ qua để tránh trùng lặp
          console.log(`Skipping delivery for user ${userId} because delivery already in progress`);
          return;
        }
        deliveringUsers.add(userId);
        try {
          // Select pending notifications that haven't been delivered yet.
          const pending = await Notification.find({
            user: userId,
            isRead: false,
            $or: [ { deliveredAt: { $exists: false } }, { deliveredAt: null } ]
          }).sort({ createdAt: 1 });
          if (pending && pending.length > 0) {
            console.log(`Delivering ${pending.length} pending notifications to user ${userId}`);
            for (const n of pending) {
              try {
                // Try to atomically claim this notification by setting deliveredAt if not already set
                const claimed = await Notification.findOneAndUpdate(
                  { _id: n._id, $or: [ { deliveredAt: { $exists: false } }, { deliveredAt: null } ] },
                  { $set: { deliveredAt: new Date() } },
                  { new: true }
                );
                if (!claimed) {
                  // Someone else/process already claimed it
                  console.log('Notification already claimed by another process:', n._id.toString());
                  continue;
                }
                // Emit claimed notification
                socket.emit('notification', claimed);
              } catch (emitErr) {
                console.error('Error emitting/claiming pending notification', n._id, emitErr);
              }
            }
          }
        } catch (err) {
          console.error('Error delivering pending notifications to user', userId, err);
        } finally {
          deliveringUsers.delete(userId);
        }
      })();

      socket.on('joinProjectRoom', (projectId) => {
        socket.join(projectId);
      });

      socket.on('leaveProjectRoom', (projectId) => {
        socket.leave(projectId);
      });
      
      // Xử lý join/leave sprint room
      socket.on('joinSprintRoom', (sprintId) => {
        socket.join(`sprint:${sprintId}`);
      });

      socket.on('leaveSprintRoom', (sprintId) => {
        socket.leave(`sprint:${sprintId}`);
      });

      socket.on('disconnect', () => {
        // Loại socketId khỏi set; nếu rỗng thì xóa key
        const set = onlineUsers.get(userId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) onlineUsers.delete(userId);
        }
      });

      // Client sẽ gửi ack khi user xem notification để backend đánh dấu là read
      socket.on('ackNotification', async (payload) => {
        // payload có thể là { id: '...', ids: ['..'] }
        try {
          const ids = [];
          if (!payload) return;
          if (Array.isArray(payload)) ids.push(...payload);
          else if (payload.ids && Array.isArray(payload.ids)) ids.push(...payload.ids);
          else if (payload.id) ids.push(payload.id);
          if (ids.length === 0) return;
          const res = await Notification.updateMany(
            { _id: { $in: ids }, user: userId },
            { $set: { isRead: true, readAt: new Date() } }
          );
          socket.emit('ackNotificationResult', { success: true, modified: res.modifiedCount });
        } catch (err) {
          console.error('Error ackNotification', err);
          socket.emit('ackNotificationResult', { success: false, error: err.message });
        }
      });

      // Test event để kiểm tra kết nối
      socket.on('test', (data) => {
        socket.emit('test_response', { message: 'Backend received test' });
      });

      // --- CHAT EVENTS ---
      // Join chat room (theo conversationId)
      socket.on('joinChatRoom', (conversationId) => {
        socket.join(conversationId);
      });

      // Gửi tin nhắn realtime
      socket.on('sendMessage', async (data) => {
        const { conversationId, text, type = 'text', fileUrl, fileName, fileSize, fileType } = data;
        if (!conversationId || (!text && !fileUrl)) return;
        try {
          const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: socket.user._id,
          });
          if (!conversation) return;
          const messageData = {
            conversationId,
            sender: socket.user._id,
            text: text ? text.trim() : '',
            type,
            fileUrl, fileName, fileSize, fileType,
          };
          const newMessage = new Message(messageData);
          const savedMessage = await newMessage.save();
          await savedMessage.populate('sender', 'username avatar');
          await Conversation.findByIdAndUpdate(conversationId, { lastMessage: savedMessage._id });
          // Gửi message cho tất cả user trong room
          const clients = await socketManager.io.in(conversationId).allSockets();
          socketManager.io.to(conversationId).emit('newMessage', savedMessage);
        } catch (err) {
          socket.emit('messageError', { error: 'Không thể gửi tin nhắn.' });
        }
      });

      // Typing
      socket.on('typing', (conversationId) => {
        socket.to(conversationId).emit('typing', socket.user.username);
      });
      socket.on('stopTyping', (conversationId) => {
        socket.to(conversationId).emit('stopTyping');
      });

      // Đánh dấu đã đọc
      socket.on('markAsRead', async (conversationId) => {
        try {
          await Message.updateMany(
            { conversationId, sender: { $ne: socket.user._id }, readBy: { $ne: socket.user._id } },
            { $addToSet: { readBy: socket.user._id } }
          );
          socketManager.io.to(conversationId).emit('messagesRead', { conversationId, readerId: socket.user._id });
        } catch (err) {
          socket.emit('error', { message: 'Could not mark messages as read' });
        }
      });
    });
    
    return this.io;
  },
  
  sendNotification(userId, notification) {
    if (this.io) {
      const userIdStr = userId.toString();
      console.log('Sending notification to user:', userIdStr);
      console.log('Online users:', Array.from(onlineUsers.keys()));
      const sockets = onlineUsers.get(userIdStr);
      if (sockets && sockets.size > 0) {
        for (const socketId of sockets) {
          try {
            this.io.to(socketId).emit('notification', notification);
            console.log('Notification sent successfully to socket:', socketId);
          } catch (err) {
            console.error('Error sending notification to socket', socketId, err);
          }
        }
        // Cập nhật deliveredAt trên DB nếu có _id
        try {
          const notifId = notification && notification._id ? notification._id : null;
          if (notifId) {
            Notification.findByIdAndUpdate(notifId, { deliveredAt: new Date() }).catch((e) => console.error('Error updating deliveredAt', e));
          }
        } catch (err) {
          console.error('Error setting deliveredAt for notification', err);
        }
      } else {
        console.log('User not online, notification not sent');
      }
    } else {
      console.log('Socket.io not initialized');
    }
  },

  broadcastToProjectRoom(projectId, event, data) {
    if (this.io) {
      this.io.to(projectId).emit(event, data);
    }
  },
  
  // Thêm hàm broadcastToSprintRoom
  broadcastToSprintRoom(sprintId, event, data) {
    if (this.io) {
      const roomName = `sprint:${sprintId}`;
      this.io.to(roomName).emit(event, data);
    }
  },

  /**
   * Gửi một sự kiện và dữ liệu trực tiếp đến một người dùng cụ thể qua socketId của họ.
   * @param {string} userId - ID của người dùng nhận.
   * @param {string} event - Tên của sự kiện.
   * @param {object} data - Dữ liệu cần gửi.
   */
  sendMessageToUser(userId, event, data) {
    if (this.io) {
      const userIdStr = userId.toString();
      const sockets = onlineUsers.get(userIdStr);
      if (sockets && sockets.size > 0) {
        for (const socketId of sockets) {
          this.io.to(socketId).emit(event, data);
        }
      }
    }
  },
};

module.exports = socketManager; 
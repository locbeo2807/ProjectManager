const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Notification = require('./models/Notification');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

// Rate limiting configuration
const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const maxRequestsPerWindow = 1000; // Increased limit for each IP to 1000 requests per window

// In-memory store for rate limiting
const rateLimitStore = new Map();

// Clean up old rate limit entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.expiresAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

// Lưu userId <-> Set(socketId) mapping để hỗ trợ nhiều thiết bị
const onlineUsers = new Map();
// Guard set để tránh deliver pending notifications nhiều lần cùng lúc cho cùng 1 user
const deliveringUsers = new Set();


const socketManager = {
  io: null,
  
  setupSocket(server) {
    // Đồng bộ cấu hình CORS với app.js
    const corsOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
      : ['http://localhost:3000'];
      
    this.io = new Server(server, {
      cors: {
        origin: corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
      },
      // Enable connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
      // Configure ping/pong timeouts
      pingTimeout: 30000,  // 30 seconds
      pingInterval: 10000, // 10 seconds
      // Maximum number of events per second per socket
      maxHttpBufferSize: 1e8, // 100MB
      // Rate limiting at the connection level
      connectTimeout: 45000, // 45 seconds
      // Limit number of connections per IP
      maxConnections: 100,
      // Enable HTTP long-polling as fallback
      transports: ['websocket', 'polling'],
    });

    // Middleware to log connection attempts and apply rate limiting
    this.io.use((socket, next) => {
      const ip = socket.handshake.address;
      console.log(`[Socket] New connection from ${ip}`);
      
      // Simple IP-based rate limiting
      const now = Date.now();
      const rateKey = `rate_limit:${ip}`;
      const rateData = rateLimitStore.get(rateKey) || { 
        count: 0, 
        firstRequestAt: now, 
        expiresAt: now + rateLimitWindowMs 
      };
      
      // Check rate limit
      if (rateData.count >= maxRequestsPerWindow) {
        const retryAfter = Math.ceil((rateData.expiresAt - now) / 1000);
        console.log(`[Socket] Rate limit exceeded for IP: ${ip}`);
        socket.emit('rate_limit_exceeded', {
          message: 'Too many requests, please try again later',
          retryAfter,
          resetTime: new Date(rateData.expiresAt).toISOString()
        });
        return next(new Error('Rate limit exceeded'));
      }
      
      // Update rate limit
      rateData.count++;
      rateLimitStore.set(rateKey, rateData);
      
      // Add rate limit info to socket for reference
      socket.rateLimit = {
        limit: maxRequestsPerWindow,
        remaining: Math.max(0, maxRequestsPerWindow - rateData.count),
        reset: Math.ceil(rateData.expiresAt / 1000)
      };
      
      // Continue with authentication
      try {
        const token = socket.handshake.auth?.token;
        if (!token) {
          console.log('[Socket] No token provided');
          return next(new Error('Authentication error: No token provided'));
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
          console.log('[Socket] Invalid token');
          return next(new Error('Authentication error: Invalid token'));
        }
        
        socket.user = decoded;
        next();
      } catch (err) {
        console.error('[Socket] Auth error:', err.message);
        next(new Error('Authentication error'));
      }
    });

    // Track active connections
    const activeConnections = new Map();
    
    this.io.on('connection', (socket) => {
      if (!socket.user || !socket.user._id) {
        console.log('[Socket] Unauthenticated connection, disconnecting');
        return socket.disconnect(true);
      }
      
      // Ensure userId is always a string
      const userId = socket.user._id.toString();
      
      // Track this connection
      const userSockets = activeConnections.get(userId) || new Set();
      userSockets.add(socket.id);
      activeConnections.set(userId, userSockets);
      
      // Log connection
      console.log(`[Socket] User ${userId} connected (${userSockets.size} connections)`);
      
      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`[Socket] User ${userId} disconnected: ${reason}`);
        
        // Clean up connection tracking
        const userSockets = activeConnections.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            activeConnections.delete(userId);
          }
        }
        
        // Leave all rooms
        Object.keys(socket.rooms).forEach(room => {
          if (room !== socket.id) { // Don't leave the default room (socket's own room)
            socket.leave(room);
          }
        });
      });

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

      // Xử lý join/leave module room
      socket.on('joinModuleRoom', (moduleId) => {
        socket.join(`module:${moduleId}`);
      });

      socket.on('leaveModuleRoom', (moduleId) => {
        socket.leave(`module:${moduleId}`);
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

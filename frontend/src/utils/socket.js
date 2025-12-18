import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_WS_URL;

class SocketManager {
  socket;

  connect(accessToken, onErrorCallback) {
    console.log('[SocketManager] connect() called');

    // Nếu đã có socket instance đang kết nối hoặc đang trong quá trình kết nối,
    // không tạo instance mới. Điều này ngăn chặn socket trùng lặp
    // (có thể gây duplicate event handlers và API calls trùng lặp).
    if (this.socket && (this.socket.connected || this.socket.connecting)) {
      console.log('[SocketManager] socket already connected/connecting, skipping creation');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      // Cài đặt kết nối lại nhẹ nhàng để tránh các kết nối lại quá mức
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
    this.socket.on('connect', () => {
      console.log('🔌 Socket connected successfully');
      this.socket.emit('test', { message: 'Frontend connected' });
    });
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });
    this.socket.on('connect_error', (err) => {
      console.error('[SocketManager] Socket connect error:', err);
      if (onErrorCallback) {
        onErrorCallback(err);
      }
    });
    this.socket.on('notification', (data) => {
      console.log('🔔 Received notification:', data);
      // Dispatch event tùy chỉnh cho notification context
      window.dispatchEvent(new CustomEvent('socket-notification', { detail: data }));
    });

    this.socket.on('test_response', (data) => {
      console.log('📡 Test response:', data);
    });
    // Log khi nhận event newMessage
    this.socket.on('newMessage', (msg) => {
      console.log('💬 New message received:', msg);
    });

    // Task events
    this.socket.on('task_assigned', (data) => {
      console.log('📋 Task assigned:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', { 
        detail: {
          type: 'task',
          message: `Task "${data.taskName}" đã được giao cho bạn`,
          title: 'Task Assignment',
          data
        }
      }));
    });

    this.socket.on('task_completed', (data) => {
      console.log('✅ Task completed:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', { 
        detail: {
          type: 'task',
          message: `Task "${data.taskName}" đã hoàn thành`,
          title: 'Task Completed',
          data
        }
      }));
    });

    this.socket.on('task_handover', (data) => {
      console.log('🔄 Task handover:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', { 
        detail: {
          type: 'handover',
          message: `Task "${data.taskName}" đã được bàn giao cho bạn`,
          title: 'Task Handover',
          data
        }
      }));
    });

    // Sprint events
    this.socket.on('sprint_started', (data) => {
      console.log('🏃 Sprint started:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', {
        detail: {
          type: 'info',
          message: `Sprint "${data.sprintName}" đã bắt đầu`,
          title: 'Sprint Started',
          data
        }
      }));
    });

    this.socket.on('sprint_completed', (data) => {
      console.log('🏁 Sprint completed:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', {
        detail: {
          type: 'milestone',
          message: `Sprint "${data.sprintName}" đã hoàn thành với velocity ${data.velocity}`,
          title: 'Sprint Completed',
          data
        }
      }));
    });

    this.socket.on('sprintCreated', (data) => {
      console.log('🆕 Sprint created:', data);
      window.dispatchEvent(new CustomEvent('sprint-created', { detail: data }));
    });

    // Project events
    this.socket.on('project_created', (data) => {
      console.log('🏗️ Project created:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', {
        detail: {
          type: 'info',
          message: `Dự án mới "${data.projectName}" đã được tạo`,
          title: 'Project Created',
          data
        }
      }));
    });

    this.socket.on('project_assigned', (data) => {
      console.log('👤 Project assigned:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', {
        detail: {
          type: 'task',
          message: `Bạn đã được giao phụ trách dự án "${data.projectName}". Vui lòng phân tích yêu cầu và tạo modules.`,
          title: 'Project Assigned',
          data
        }
      }));
    });

    this.socket.on('project_confirmed', (data) => {
      console.log('✅ Project confirmed:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', {
        detail: {
          type: 'success',
          message: `Dự án "${data.projectName}" đã được phê duyệt`,
          title: 'Project Confirmed',
          data
        }
      }));
    });

    // SLA events
    this.socket.on('sla_warning', (data) => {
      console.log('⚠️ SLA warning:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', { 
        detail: {
          type: 'sla',
          message: `SLA cảnh báo: ${data.slaType} cho "${data.itemName}" ${data.remainingHours}`,
          title: 'SLA Warning',
          data
        }
      }));
    });

    this.socket.on('sla_breach', (data) => {
      console.log('🚨 SLA breach:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', { 
        detail: {
          type: 'sla',
          message: `SLA vi phạm: ${data.slaType} cho "${data.itemName}" đã ${data.remainingHours}`,
          title: 'SLA Breach',
          data
        }
      }));
    });

    // Budget events
    this.socket.on('budget_warning', (data) => {
      console.log('💰 Budget warning:', data);
      window.dispatchEvent(new CustomEvent('socket-notification', { 
        detail: {
          type: 'budget',
          message: `Ngân sách dự án "${data.projectName}" đã sử dụng ${data.percentage}%`,
          title: 'Budget Warning',
          data
        }
      }));
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
    }
  }

  joinProjectRoom(projectId) {
    if (this.socket) {
      this.socket.emit('joinProjectRoom', projectId);
      console.log(`🏢 Joined project room: ${projectId}`);
    }
  }

  leaveProjectRoom(projectId) {
    if (this.socket) {
      this.socket.emit('leaveProjectRoom', projectId);
      console.log(`🏢 Left project room: ${projectId}`);
    }
  }

  joinModuleRoom(moduleId) {
    if (this.socket) {
      this.socket.emit('joinModuleRoom', moduleId);
      console.log(`📁 Joined module room: ${moduleId}`);
    }
  }

  leaveModuleRoom(moduleId) {
    if (this.socket) {
      this.socket.emit('leaveModuleRoom', moduleId);
      console.log(`📁 Left module room: ${moduleId}`);
    }
  }

  // --- CHAT EVENTS ---
  joinChatRoom(conversationId) {
    if (this.socket) {
      this.socket.emit('joinChatRoom', conversationId);
      console.log(`💬 Joined chat room: ${conversationId}`);
    }
  }

  sendChatMessage(data) {
    if (this.socket) {
      this.socket.emit('sendMessage', data);
    }
  }

  typing(conversationId) {
    if (this.socket) {
      this.socket.emit('typing', conversationId);
    }
  }

  stopTyping(conversationId) {
    if (this.socket) {
      this.socket.emit('stopTyping', conversationId);
    }
  }

  markAsRead(conversationId) {
    if (this.socket) {
      this.socket.emit('markAsRead', conversationId);
    }
  }

  joinSprintRoom(sprintId) {
    if (this.socket) {
      this.socket.emit('joinSprintRoom', sprintId);
      console.log(`🏃 Joined sprint room: ${sprintId}`);
    }
  }

  leaveSprintRoom(sprintId) {
    if (this.socket) {
      this.socket.emit('leaveSprintRoom', sprintId);
      console.log(`🏃 Left sprint room: ${sprintId}`);
    }
  }

  // --- NOTIFICATION EVENTS ---
  markNotificationAsRead(notificationId) {
    if (this.socket) {
      this.socket.emit('markNotificationAsRead', notificationId);
    }
  }

  markAllNotificationsAsRead() {
    if (this.socket) {
      this.socket.emit('markAllNotificationsAsRead');
    }
  }

  // --- STATUS EVENTS ---
  updateTaskStatus(taskId, status) {
    if (this.socket) {
      this.socket.emit('updateTaskStatus', { taskId, status });
    }
  }

  updateSprintStatus(sprintId, status) {
    if (this.socket) {
      this.socket.emit('updateSprintStatus', { sprintId, status });
    }
  }

  // --- HANDOVER EVENTS ---
  initiateHandover(taskId, fromUserId, toUserId, toReviewerId) {
    if (this.socket) {
      this.socket.emit('initiateHandover', { taskId, fromUserId, toUserId, toReviewerId });
    }
  }

  completeHandover(taskId, handoverData) {
    if (this.socket) {
      this.socket.emit('completeHandover', { taskId, handoverData });
    }
  }

  // --- REAL-TIME COLLABORATION ---
  joinTaskRoom(taskId) {
    if (this.socket) {
      this.socket.emit('joinTaskRoom', taskId);
      console.log(`📋 Joined task room: ${taskId}`);
    }
  }

  leaveTaskRoom(taskId) {
    if (this.socket) {
      this.socket.emit('leaveTaskRoom', taskId);
      console.log(`📋 Left task room: ${taskId}`);
    }
  }

  sendTaskUpdate(taskId, updateData) {
    if (this.socket) {
      this.socket.emit('taskUpdate', { taskId, updateData });
    }
  }

  // --- ACTIVITY TRACKING ---
  trackActivity(activityData) {
    if (this.socket) {
      this.socket.emit('trackActivity', activityData);
    }
  }

  // --- CONNECTION STATUS ---
  isConnected() {
    return this.socket && this.socket.connected;
  }

  getConnectionStatus() {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'connecting';
  }
}

const socketManager = new SocketManager();
export default socketManager;

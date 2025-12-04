import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast, Slide, Zoom, Flip, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import socketManager from '../utils/socket';
import { useAuth } from './AuthContext';

// Notification Context
const NotificationContext = createContext();

// Toast configuration
const toastConfig = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  transition: Slide,
  newestOnTop: true,
  rtl: false,
  pauseOnFocusLoss: true,
  closeButton: true,
  limit: 5, // Maximum 5 notifications at once
};

// Notification types and their configurations
const notificationTypes = {
  // Success notifications
  success: {
    icon: '✅',
    className: 'toast-success',
    theme: 'light',
    style: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
    },
  },
  
  // Error notifications
  error: {
    icon: '❌',
    className: 'toast-error',
    theme: 'light',
    style: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: 'white',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(245, 87, 108, 0.3)',
    },
  },
  
  // Warning notifications
  warning: {
    icon: '⚠️',
    className: 'toast-warning',
    theme: 'light',
    style: {
      background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      color: 'white',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(250, 112, 154, 0.3)',
    },
  },
  
  // Info notifications
  info: {
    icon: 'ℹ️',
    className: 'toast-info',
    theme: 'light',
    style: {
      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: 'white',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(79, 172, 254, 0.3)',
    },
  },
  
  // Task notifications
  task: {
    icon: '📋',
    className: 'toast-task',
    theme: 'light',
    style: {
      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      color: 'white',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(67, 233, 123, 0.3)',
    },
  },
  
  // Handover notifications
  handover: {
    icon: '🔄',
    className: 'toast-handover',
    theme: 'light',
    style: {
      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      color: '#333',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(252, 182, 159, 0.3)',
    },
  },
  
  // SLA notifications
  sla: {
    icon: '⏰',
    className: 'toast-sla',
    theme: 'light',
    style: {
      background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      color: '#333',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(255, 154, 158, 0.3)',
    },
  },
  
  // Budget notifications
  budget: {
    icon: '💰',
    className: 'toast-budget',
    theme: 'light',
    style: {
      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      color: '#333',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(168, 237, 234, 0.3)',
    },
  },
  
  // Milestone notifications
  milestone: {
    icon: '🎯',
    className: 'toast-milestone',
    theme: 'light',
    style: {
      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      color: '#333',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(252, 182, 159, 0.3)',
    },
  },
};

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopEnabled, setDesktopEnabled] = useState(true);

  // Request desktop notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Socket connection for real-time notifications
  useEffect(() => {
    if (!accessToken) return;
    
    const handleSocketNotification = (event) => {
      const notification = event.detail;
      showNotification(notification);
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
    };

    // Listen for socket notifications via custom events
    window.addEventListener('socket-notification', handleSocketNotification);
    
    return () => {
      window.removeEventListener('socket-notification', handleSocketNotification);
    };
  }, [accessToken, showNotification]);

  // Play notification sound
  const playNotificationSound = useCallback((type = 'default') => {
    if (!soundEnabled) return;
    
    try {
      const audio = new Audio(`/sounds/notification-${type}.mp3`);
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Fallback to default sound
        const fallbackAudio = new Audio('/sounds/notification.mp3');
        fallbackAudio.volume = 0.3;
        fallbackAudio.play();
      });
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, [soundEnabled]);

  // Show desktop notification
  const showDesktopNotification = useCallback((title, body, icon = '/favicon.ico') => {
    if (!desktopEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body,
      icon,
      badge: '/favicon.ico',
      tag: 'project-management',
      requireInteraction: false,
      silent: false,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Click handler
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }, [desktopEnabled]);

  // Show toast notification
  const showNotification = useCallback((notification) => {
    const { message, type = 'info', title, data } = notification;
    
    // Get notification config
    const config = notificationTypes[type] || notificationTypes.info;
    
    // Play sound
    playNotificationSound(type);
    
    // Show desktop notification
    if (title) {
      showDesktopNotification(title, message, config.icon);
    }
    
    // Show toast
    const toastMessage = (
      <div className="notification-content">
        <div className="notification-icon">{config.icon}</div>
        <div className="notification-text">
          {title && <div className="notification-title">{title}</div>}
          <div className="notification-message">{message}</div>
        </div>
      </div>
    );

    toast(toastMessage, {
      ...toastConfig,
      className: `custom-toast ${config.className}`,
      style: config.style,
      transition: Slide,
      icon: false,
    });
  }, [playNotificationSound, showDesktopNotification]);

  // Custom notification methods
  const notify = {
    success: (message, title = null) => showNotification({ message, title, type: 'success' }),
    error: (message, title = null) => showNotification({ message, title, type: 'error' }),
    warning: (message, title = null) => showNotification({ message, title, type: 'warning' }),
    info: (message, title = null) => showNotification({ message, title, type: 'info' }),
    task: (message, title = null) => showNotification({ message, title, type: 'task' }),
    handover: (message, title = null) => showNotification({ message, title, type: 'handover' }),
    sla: (message, title = null) => showNotification({ message, title, type: 'sla' }),
    budget: (message, title = null) => showNotification({ message, title, type: 'budget' }),
    milestone: (message, title = null) => showNotification({ message, title, type: 'milestone' }),
  };

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
  }, []);

  const value = {
    notifications,
    unreadCount,
    notify,
    soundEnabled,
    setSoundEnabled,
    desktopEnabled,
    setDesktopEnabled,
    markAllAsRead,
    clearNotifications,
    removeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
      clearTimeout(reconnectTimeoutId);
      if (reconnectToastId) {
        toast.dismiss(reconnectToastId);
      }
    };
  }, [user, accessToken, fetchNotifications, handleNotification]);

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 

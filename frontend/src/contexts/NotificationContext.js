import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import notificationService from '../services/notificationService';
import socketManager from '../utils/socket';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const useNotification = useNotifications;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const fetchInProgressRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const FETCH_COOLDOWN_MS = 5000; // don't fetch more than once every 5s
  // Tạm thời lấy user từ localStorage để fix nhanh
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const accessToken = localStorage.getItem('accessToken');
  const socketInitialized = useRef(false);
  
  console.log('NotificationProvider init:', { user: user?.name, accessToken: accessToken ? 'exists' : 'missing' });

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    // Guard: avoid concurrent or too-frequent fetches that trigger rate-limits
    if (fetchInProgressRef.current) {
      console.log('fetchNotifications skipped: already in progress');
      return;
    }
    const now = Date.now();
    if (now - lastFetchAtRef.current < FETCH_COOLDOWN_MS) {
      console.log('fetchNotifications skipped: cooldown');
      return;
    }

    fetchInProgressRef.current = true;
    console.log('fetchNotifications called');

    try {
      setLoading(true);
      console.log('Fetching notifications from server...');
      const response = await notificationService.getNotifications();
      console.log('Notifications response:', response);
      // notificationService.getNotifications returns response.data (array) or a paginated object.
      let fetchedNotifications = [];
      if (!response) fetchedNotifications = [];
      else if (Array.isArray(response)) fetchedNotifications = response;
      else if (Array.isArray(response.data)) fetchedNotifications = response.data;
      else if (Array.isArray(response.items)) fetchedNotifications = response.items;
      else fetchedNotifications = [];
      console.log('Fetched notifications:', fetchedNotifications.length);
      // Deduplicate by _id just in case server returns duplicates
      const unique = [];
      const seen = new Set();
      for (const n of fetchedNotifications) {
        if (!n || !n._id) continue;
        if (seen.has(n._id)) continue;
        seen.add(n._id);
        unique.push(n);
      }
      // Sort by createdAt descending (newest first) then keep latest 50
      unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(unique.slice(0, 50)); // Keep latest 50 notifications
      setUnreadCount(unique.filter(n => !n.isRead).length);
      console.log('Unread count set:', unique.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
      lastFetchAtRef.current = Date.now();
    }
  }, [user]);

  // Handle incoming socket notifications
  const handleNotification = useCallback((newNotification) => {
    console.log('handleNotification called with:', newNotification);
    // Defensively check if the notification is valid and not a general update event
    if (!newNotification || !newNotification.message || newNotification.type === 'project_updated') {
      console.log('Invalid notification or project_updated, skipping');
      return; // Do not process
    }
    
    console.log('Processing notification:', newNotification.message);
    // Hiển thị toast notification
    toast.info(newNotification.message);
    
    // Cập nhật state, tránh duplicate dựa trên _id
    setNotifications(prev => {
      try {
        if (!newNotification || !newNotification._id) return prev;
        // If already present, skip
        if (prev.some(n => n._id === newNotification._id)) return prev;
        return [newNotification, ...prev].slice(0, 50);
      } catch (e) {
        console.error('Error updating notifications state', e);
        return prev;
      }
    });
    setUnreadCount(prev => prev + 1);
    
    // Nếu là project_created hoặc project_updated, phát event để Projects.js lắng nghe
    if (
      newNotification.type === 'project_created' ||
      newNotification.type === 'project_updated'
    ) {
      window.dispatchEvent(new Event('refreshProjects'));
    }
  }, [user]);

  // Also listen to window-level 'socket-notification' events which some clients dispatch
  useEffect(() => {
    const handler = (ev) => {
      try {
        const payload = ev?.detail || ev?.data || ev;
        // Use same handler to process notification
        handleNotification(payload);
      } catch (err) {
        console.error('Error handling window socket-notification event', err);
      }
    };

    window.addEventListener('socket-notification', handler);
    return () => window.removeEventListener('socket-notification', handler);
  }, [handleNotification]);

  // Initialize socket connection
  useEffect(() => {
    if (!user || !accessToken || socketInitialized.current) {
      return;
    }

    let reconnectToastId = null;
    let reconnectTimeoutId = null;

    const handleError = (error) => {
      console.error('Socket connection error:', error);
      if (!reconnectToastId) {
        reconnectToastId = toast.error(
          'Mất kết nối thời gian thực. Đang thử kết nối lại...', 
          { autoClose: false, closeOnClick: false, draggable: false }
        );
      }
      
      // Thử kết nối lại sau 10 giây
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = setTimeout(() => {
        socketManager.connect(accessToken, handleError);
      }, 10000);
    };

    const handleSuccess = () => {
      fetchNotifications();
      if (reconnectToastId) {
        toast.dismiss(reconnectToastId);
        toast.success('Kết nối thời gian thực đã được khôi phục!');
        reconnectToastId = null;
      }
    };

    socketManager.connect(accessToken, handleError);
    socketInitialized.current = true;

    socketManager.on('connect', handleSuccess);
    socketManager.on('notification', handleNotification);

    return () => {
      socketManager.off('notification', handleNotification);
      socketManager.off('connect', handleSuccess);
      socketManager.disconnect();
      socketInitialized.current = false;
      
      clearTimeout(reconnectTimeoutId);
      if (reconnectToastId) {
        toast.dismiss(reconnectToastId);
      }
    };
  }, [user, accessToken, fetchNotifications, handleNotification]);

  // Load unread count immediately when provider mounts (so bell shows number quickly)
  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      if (!user) return;
      try {
        const res = await notificationService.getUnreadCount();
        const count = (res && typeof res.count !== 'undefined') ? res.count : (typeof res === 'number' ? res : 0);
        if (!cancelled) setUnreadCount(Number(count) || 0);
        console.log('Initial unread count:', count);
      } catch (err) {
        console.error('Failed to load unread count', err);
      }
    };
    loadUnread();
    return () => { cancelled = true; };
  }, [user]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      const notification = notifications.find(n => n._id === notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Remove notification from state (without deleting from server)
  const removeNotification = (notificationId) => {
    const notification = notifications.find(n => n._id === notificationId);
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
    if (notification && !notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
    removeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Custom close button + disable closeOnClick to avoid race where toast is removed then closeToast called */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        closeButton={({ closeToast, toastProps }) => {
          // defensive wrapper
          const handleClick = () => {
            try {
              if (typeof closeToast === 'function') closeToast(true);
            } catch (err) {
              console.error('Safe closeToast failed', err);
            }
          };
          return (
            <button onClick={handleClick} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} aria-label="close">×</button>
          );
        }}
      />
    </NotificationContext.Provider>
  );
};

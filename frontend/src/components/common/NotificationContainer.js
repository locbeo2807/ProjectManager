import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';

// Custom notification components
export const NotificationContainer = () => {
  const { notifications, unreadCount, markAllAsRead, clearNotifications, removeNotification } = useNotifications();

  return (
    <div className="notification-container">
      {/* Notification Bell Icon */}
      <div className="notification-bell">
        <div className="bell-icon">
          🔔
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </div>
        
        {/* Notification Dropdown */}
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Thông báo</h3>
            <div className="notification-actions">
              <button onClick={markAllAsRead} className="mark-read-btn">
                Đánh dấu đã đọc
              </button>
              <button onClick={clearNotifications} className="clear-btn">
                Xóa tất cả
              </button>
            </div>
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <div className="no-notifications-icon">📭</div>
                <p>Không có thông báo mới</p>
              </div>
            ) : (
              notifications.slice(0, 5).map(notification => (
                <div key={notification._id} className="notification-item">
                  <div className="notification-content">
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-details">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {new Date(notification.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeNotification(notification._id)}
                    className="remove-notification"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Get notification icon based on type
const getNotificationIcon = (type) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    task: '📋',
    handover: '🔄',
    sla: '⏰',
    budget: '💰',
    milestone: '🎯',
    project_created: '🏗️',
    project_confirmed: '✅',
    project_completed: '🎉',
    module_created: '📦',
    module_completed: '📦',
    sprint_created: '🏃',
    sprint_completed: '🏁',
    task_assigned: '👤',
    task_completed: '✅',
    task_reviewed_passed: '✅',
    task_reviewed_failed: '❌',
    task_qa_passed: '✅',
    task_qa_failed: '❌',
    risk_created: '⚠️',
    risk_critical: '🚨',
    risk_high: '⚠️',
    risk_mitigated: '✅',
    quality_gate_failed: '❌',
    quality_gate_passed: '✅',
    technical_debt_created: '💸',
    technical_debt_resolved: '✅',
    release_created: '🚀',
    release_approved: '✅',
    release_deployed: '🎉',
    release_failed: '❌',
  };
  
  return icons[type] || 'ℹ️';
};

export default NotificationContainer;

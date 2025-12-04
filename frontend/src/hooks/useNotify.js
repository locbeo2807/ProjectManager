import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { toast } from 'react-toastify';

// Hook for easy notification usage
export const useNotify = () => {
  
  return {
    success: (message) => toast.success(message),
    error: (message) => toast.error(message),
    warning: (message) => toast.warning(message),
    info: (message) => toast.info(message),
    task: (message) => toast.info(message),
    handover: (message) => toast.info(message),
    sla: (message) => toast.warning(message),
    budget: (message) => toast.warning(message),
    milestone: (message) => toast.success(message),
  };
};

// Higher-order component for notification access
export const withNotifications = (Component) => {
  return function WrappedComponent(props) {
    const notifications = useNotifications();
    
    return <Component {...props} notifications={notifications} />;
  };
};

// Notification presets for common actions
export const notificationPresets = {
  // Task notifications
  taskCreated: (taskName, sprintName) => ({
    type: 'task',
    message: `Task "${taskName}" đã được tạo trong sprint "${sprintName}"`,
    title: 'Task Created'
  }),
  
  taskAssigned: (taskName, assignerName) => ({
    type: 'task',
    message: `Task "${taskName}" đã được giao cho bạn bởi ${assignerName}`,
    title: 'Task Assignment'
  }),
  
  taskStarted: (taskName, assigneeName) => ({
    type: 'task',
    message: `${assigneeName} đã bắt đầu làm task "${taskName}"`,
    title: 'Task Started'
  }),
  
  taskCompleted: (taskName, assigneeName) => ({
    type: 'task',
    message: `Task "${taskName}" đã hoàn thành bởi ${assigneeName}`,
    title: 'Task Completed'
  }),
  
  taskReviewAssigned: (taskName) => ({
    type: 'task',
    message: `Task "${taskName}" cần bạn review trong vòng 24 giờ`,
    title: 'Review Assignment'
  }),
  
  taskReviewPassed: (taskName, reviewerName) => ({
    type: 'task',
    message: `Task "${taskName}" đã được duyệt bởi ${reviewerName}`,
    title: 'Review Passed'
  }),
  
  taskReviewFailed: (taskName, reviewerName) => ({
    type: 'error',
    message: `Task "${taskName}" chưa được duyệt bởi ${reviewerName}`,
    title: 'Review Failed'
  }),
  
  taskQAPassed: (taskName) => ({
    type: 'task',
    message: `Task "${taskName}" đã pass QA và sẵn sàng release`,
    title: 'QA Passed'
  }),
  
  taskQAFailed: (taskName) => ({
    type: 'error',
    message: `Task "${taskName}" bị reject bởi QA - cần fix`,
    title: 'QA Failed'
  }),
  
  // Handover notifications
  handoverInitiated: (taskName, fromUser, toUser) => ({
    type: 'handover',
    message: `Task "${taskName}" đã được bàn giao từ ${fromUser} sang ${toUser}`,
    title: 'Handover Initiated'
  }),
  
  handoverCompleted: (taskName) => ({
    type: 'handover',
    message: `Task "${taskName}" đã được bàn giao thành công`,
    title: 'Handover Completed'
  }),
  
  handoverRejected: (taskName, reason) => ({
    type: 'error',
    message: `Bàn giao task "${taskName}" đã bị từ chối: ${reason}`,
    title: 'Handover Rejected'
  }),
  
  // Sprint notifications
  sprintStarted: (sprintName, totalTasks) => ({
    type: 'info',
    message: `Sprint "${sprintName}" đã bắt đầu với ${totalTasks} tasks`,
    title: 'Sprint Started'
  }),
  
  sprintCompleted: (sprintName, velocity) => ({
    type: 'milestone',
    message: `Sprint "${sprintName}" đã hoàn thành với velocity ${velocity}`,
    title: 'Sprint Completed'
  }),
  
  // Project notifications
  projectCreated: (projectName, creatorName) => ({
    type: 'info',
    message: `Dự án "${projectName}" đã được tạo bởi ${creatorName}`,
    title: 'Project Created'
  }),
  
  projectConfirmed: (projectName) => ({
    type: 'success',
    message: `Dự án "${projectName}" đã được phê duyệt`,
    title: 'Project Confirmed'
  }),
  
  // SLA notifications
  slaWarning: (itemType, itemName, remainingTime) => ({
    type: 'sla',
    message: `SLA cảnh báo: ${itemType} "${itemName}" ${remainingTime}`,
    title: 'SLA Warning'
  }),
  
  slaBreach: (itemType, itemName, delayTime) => ({
    type: 'sla',
    message: `SLA vi phạm: ${itemType} "${itemName}" đã ${delayTime}`,
    title: 'SLA Breach'
  }),
  
  // Budget notifications
  budgetWarning: (projectName, percentage) => ({
    type: 'budget',
    message: `Ngân sách dự án "${projectName}" đã sử dụng ${percentage}%`,
    title: 'Budget Warning'
  }),
  
  // Error notifications
  apiError: (action, error) => ({
    type: 'error',
    message: `Không thể ${action}: ${error.message || 'Lỗi không xác định'}`,
    title: 'API Error'
  }),
  
  networkError: (action) => ({
    type: 'error',
    message: `Lỗi kết nối khi ${action}. Vui lòng kiểm tra mạng của bạn.`,
    title: 'Network Error'
  }),
  
  // Success notifications
  saveSuccess: (itemType, itemName) => ({
    type: 'success',
    message: `${itemType} "${itemName}" đã được lưu thành công`,
    title: 'Save Successful'
  }),
  
  deleteSuccess: (itemType, itemName) => ({
    type: 'success',
    message: `${itemType} "${itemName}" đã được xóa thành công`,
    title: 'Delete Successful'
  }),
  
  updateSuccess: (itemType, itemName) => ({
    type: 'success',
    message: `${itemType} "${itemName}" đã được cập nhật thành công`,
    title: 'Update Successful'
  }),
  
  // Warning notifications
  confirmDelete: (itemType, itemName) => ({
    type: 'warning',
    message: `Bạn có chắc muốn xóa ${itemType} "${itemName}"?`,
    title: 'Confirm Delete'
  }),
  
  unsavedChanges: () => ({
    type: 'warning',
    message: 'Bạn có thay đổi chưa được lưu. Bạn có muốn tiếp tục?',
    title: 'Unsaved Changes'
  }),
  
  // Info notifications
  loading: (action) => ({
    type: 'info',
    message: `Đang ${action}...`,
    title: 'Loading'
  }),
  
  noData: (itemType) => ({
    type: 'info',
    message: `Không có dữ liệu ${itemType}`,
    title: 'No Data'
  })
};

// Notification helper functions
export const showNotification = (notificationData, toastConfig = {}) => {
  if (typeof notificationData === 'string') {
    notificationData = { message: notificationData, type: 'info' };
  }
  
  const { type = 'info', message } = notificationData;
  
  // Show toast notification directly
  switch (type) {
    case 'success':
      toast.success(message, toastConfig);
      break;
    case 'error':
      toast.error(message, toastConfig);
      break;
    case 'warning':
      toast.warning(message, toastConfig);
      break;
    default:
      toast.info(message, toastConfig);
  }
};

// Higher-order component for notifications
export const withNotification = (Component) => {
  return (props) => {
    const notify = useNotify();
    return <Component {...props} notify={notify} />;
  };
};

export default useNotify;

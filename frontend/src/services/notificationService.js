import axiosInstance from '../api/axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// helper: exponential backoff retry cho responses 429
async function requestWithBackoff(fn, { retries = 4, minDelay = 500 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status;
      attempt++;
      if (status === 429 && attempt <= retries) {
        const jitter = Math.random() * 300;
        const delay = Math.pow(2, attempt) * minDelay + jitter;
        // eslint-disable-next-line no-await-in-loop
        await new Promise(res => setTimeout(res, delay));
        continue; // retry
      }
      throw err;
    }
  }
}

class NotificationService {
  // Lấy tất cả notifications cho user hiện tại
  async getNotifications() {
    try {
      const response = await requestWithBackoff(() => axiosInstance.get(`${API_BASE_URL}/notifications`));
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Đánh dấu notification là đã đọc
  async markAsRead(notificationId) {
    try {
      const response = await axiosInstance.put(`${API_BASE_URL}/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Đánh dấu tất cả notifications là đã đọc
  async markAllAsRead() {
    try {
      // backend route expects PATCH /notifications/read
      const response = await requestWithBackoff(() => axiosInstance.patch(`${API_BASE_URL}/notifications/read`));
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete a notification
  async deleteNotification(notificationId) {
    try {
      const response = await axiosInstance.delete(`${API_BASE_URL}/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Clear all notifications
  async clearAllNotifications() {
    try {
      const response = await axiosInstance.delete(`${API_BASE_URL}/notifications`);
      return response.data;
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  // Lấy số lượng notifications chưa đọc
  async getUnreadCount() {
    // Simple client-side caching + in-flight guard to avoid hammering the endpoint
    if (!this._unreadCache) {
      this._unreadCache = { ts: 0, value: null, pending: null };
    }
    const COOLDOWN = 5000; // ms
    const now = Date.now();

    // Nếu có request đang chờ, trả về nó (để callers chia sẻ cùng promise)
    if (this._unreadCache.pending) return this._unreadCache.pending;

    // Nếu có cache và còn mới, trả về giá trị cache
    if (this._unreadCache.ts && now - this._unreadCache.ts < COOLDOWN) {
      return Promise.resolve(this._unreadCache.value);
    }

    // Ngược lại, tạo request và cache kết quả
    const p = requestWithBackoff(() => axiosInstance.get(`${API_BASE_URL}/notifications/unread-count`))
      .then((res) => {
        this._unreadCache.ts = Date.now();
        // Chuẩn hóa response thành số. Server có thể trả về số trần hoặc object như { count } hoặc { unreadCount }.
        const data = res && typeof res.data !== 'undefined' ? res.data : res;
        let num = 0;
        if (typeof data === 'number') num = data;
        else if (data && typeof data.count !== 'undefined') num = Number(data.count);
        else if (data && typeof data.unreadCount !== 'undefined') num = Number(data.unreadCount);
        else if (data && typeof data.data !== 'undefined' && typeof data.data === 'number') num = data.data;
        else num = 0;

        this._unreadCache.value = num;
        this._unreadCache.pending = null;
        return num;
      })
      .catch((err) => {
        this._unreadCache.pending = null;
        throw err;
      });

    this._unreadCache.pending = p;
    return p;
  }

  // Tạo notification mới (dùng cho admin/system)
  async createNotification(notificationData) {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/notifications`, notificationData);
      return response.data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Lấy notifications theo loại
  async getNotificationsByType(type) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/notifications/type/${type}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications by type:', error);
      throw error;
    }
  }

  // Lấy notifications với phân trang
  async getNotificationsPaginated(page = 1, limit = 20) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/notifications`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching paginated notifications:', error);
      throw error;
    }
  }

  // Update notification preferences
  async updatePreferences(preferences) {
    try {
      const response = await axiosInstance.put(`${API_BASE_URL}/notifications/preferences`, preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Get notification preferences
  async getPreferences() {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/notifications/preferences`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  // Đăng ký các loại notifications
  async subscribeToTypes(types) {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/notifications/subscribe`, { types });
      return response.data;
    } catch (error) {
      console.error('Error subscribing to notification types:', error);
      throw error;
    }
  }

  // Hủy đăng ký các loại notifications
  async unsubscribeFromTypes(types) {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/notifications/unsubscribe`, { types });
      return response.data;
    } catch (error) {
      console.error('Error unsubscribing from notification types:', error);
      throw error;
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;

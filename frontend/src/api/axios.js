import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Interceptor cho request
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Thiết lập Content-Type cho request JSON (không phải FormData)
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor cho response
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Kiểm tra nếu lỗi là 401, không phải request retry, và không phải endpoint login/refresh-token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          // Sử dụng axios instance tạm thời để tránh recursive interceptors
          const tempAxios = axios.create({ baseURL: process.env.REACT_APP_API_URL });
          const res = await tempAxios.post('/auth/refresh-token', { refreshToken });
          
          const { accessToken } = res.data;
          
          // Cập nhật localStorage với accessToken mới
          localStorage.setItem('accessToken', accessToken);
          
          // Dispatch event tùy chỉnh để thông báo app rằng token đã được refresh
          window.dispatchEvent(new Event('tokenRefreshed'));

          // Cập nhật header của request gốc
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

          // Retry request gốc với token mới
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          // Nếu refresh token thất bại, xóa tất cả dữ liệu auth và redirect về login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // Nếu không có refresh token, xóa tất cả dữ liệu auth và redirect về login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        // Không cần return gì ở đây, vì chúng ta đang redirect
        return Promise.reject(new Error("No refresh token available."));
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 
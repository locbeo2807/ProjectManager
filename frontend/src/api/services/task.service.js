import axiosInstance from '../axios';

const TaskService = {
  // Lấy tất cả task
  getAllTasks: async () => {
    const response = await axiosInstance.get('/tasks');
    return response.data;
  },
  
  // Lấy task theo sprintId (nếu cần)
  getTasksBySprint: async (sprintId) => {
    if (!sprintId) throw new Error('sprintId is required');
    const response = await axiosInstance.get(`/tasks/by-sprint/${sprintId}`);
    return response.data;
  },

  // Lấy chi tiết một task
  getTask: async (id) => {
    const response = await axiosInstance.get(`/tasks/${id}`);
    return response.data;
  },

  getTaskById: async (id) => {
    const response = await axiosInstance.get(`/tasks/${id}`);
    return response.data;
  },

  createTask: async (taskData) => {
    const response = await axiosInstance.post('/tasks', taskData);
    return response.data;
  },

  updateTask: async (id, taskData) => {
    const response = await axiosInstance.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  deleteTask: async (id) => {
    const response = await axiosInstance.delete(`/tasks/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await axiosInstance.patch(`/tasks/${id}/status`, { status });
    return response.data;
  },

  updateTaskStatus: async (id, data) => {
    const response = await axiosInstance.put(`/tasks/${id}`, data);
    return response.data;
  },

  addHistory: async (id, historyData) => {
    const response = await axiosInstance.post(`/tasks/${id}/log-time`, historyData);
    return response.data;
  },

  uploadFile: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`/tasks/${taskId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getTaskFiles: async (taskId) => {
    const response = await axiosInstance.get(`/tasks/${taskId}/files`);
    return response.data;
  },

  downloadFile: async (taskId, fileId) => {
    const response = await axiosInstance.get(`/tasks/${taskId}/files/${fileId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Completion files methods
  uploadCompletionFiles: async (taskId, files, description) => {
    const formData = new FormData();
    // files can be FileList or Array
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      formData.append('completionFiles', file);
    });
    if (description) {
      formData.append('description', description);
    }
    const response = await axiosInstance.post(`/tasks/${taskId}/completion-files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getCompletionFiles: async (taskId) => {
    const response = await axiosInstance.get(`/tasks/${taskId}/completion-files`);
    return response.data;
  },

  downloadCompletionFile: async (taskId, fileId) => {
    const response = await axiosInstance.get(`/tasks/${taskId}/completion-files/${fileId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  deleteCompletionFile: async (taskId, fileId) => {
    const response = await axiosInstance.delete(`/tasks/${taskId}/completion-files/${fileId}`);
    return response.data;
  },

  // Add missing singular upload method for backward compatibility
  uploadCompletionFile: async (taskId, file) => {
    const formData = new FormData();
    formData.append('completionFiles', file);
    const response = await axiosInstance.post(`/tasks/${taskId}/completion-files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateTaskReviewStatus: async (id, data) => {
    const response = await axiosInstance.put(`/tasks/${id}/review-status`, data);
    return response.data;
  },

  getTimeLogs: async (id) => {
    const response = await axiosInstance.get(`/tasks/${id}/time-logs`);
    return response.data;
  },

  getTaskNavigationInfo: async (taskId) => {
    const response = await axiosInstance.get(`/tasks/navigation-info/${taskId}`);
    return response.data;
  }
};

export default TaskService;

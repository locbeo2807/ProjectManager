import axiosInstance from '../api/axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class TaskService {
  // Lấy tất cả tasks cho một sprint
  async getSprintTasks(sprintId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/sprints/${sprintId}/tasks`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sprint tasks:', error);
      throw error;
    }
  }

  // Update task review status (Đạt / Không đạt)
  async updateTaskReviewStatus(id, data) {
    try {
      const response = await axiosInstance.put(`${API_BASE_URL}/tasks/${id}/review-status`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating task review status:', error);
      throw error;
    }
  }

  // Alias cho backward compatibility (dùng bởi HandoverWorkflow)
  async getTasksBySprint(sprintId) {
    return this.getSprintTasks(sprintId);
  }

  // Lấy một task theo ID
  async getTask(taskId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }

  // Tạo task mới
  async createTask(taskData) {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/tasks`, taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Cập nhật task hiện có
  async updateTask(taskId, taskData) {
    try {
      const response = await axiosInstance.put(`${API_BASE_URL}/tasks/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Xóa task
  async deleteTask(taskId) {
    try {
      const response = await axiosInstance.delete(`${API_BASE_URL}/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Giao task cho user
  async assignTask(taskId, userId) {
    try {
      const response = await axiosInstance.put(`${API_BASE_URL}/tasks/${taskId}/assign`, { userId });
      return response.data;
    } catch (error) {
      console.error('Error assigning task:', error);
      throw error;
    }
  }

  // Cập nhật status task
  async updateTaskStatus(taskId, status, additionalData = {}) {
    try {
      const response = await axiosInstance.put(`${API_BASE_URL}/tasks/${taskId}/status`, {
        status,
        ...additionalData
      });
      return response.data;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  // Thêm comment vào task
  async addComment(taskId, comment) {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/tasks/${taskId}/comments`, { comment });
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Lấy comments của task
  async getTaskComments(taskId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/tasks/${taskId}/comments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task comments:', error);
      throw error;
    }
  }

  // Upload files hoàn thành cho task
  async uploadCompletionFiles(taskId, files, description = '') {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('completionFiles', file);
      });
      if (description) {
        formData.append('description', description);
      }

      const response = await axiosInstance.post(`${API_BASE_URL}/tasks/${taskId}/completion-files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading completion files:', error);
      throw error;
    }
  }

  // Lấy files hoàn thành của task
  async getCompletionFiles(taskId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/tasks/${taskId}/completion-files`);
      return response.data;
    } catch (error) {
      console.error('Error fetching completion files:', error);
      throw error;
    }
  }

  // Delete completion file
  async deleteCompletionFile(taskId, fileId) {
    try {
      const response = await axiosInstance.delete(`${API_BASE_URL}/tasks/${taskId}/completion-files/${fileId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting completion file:', error);
      throw error;
    }
  }

  // Download completion file
  async downloadCompletionFile(taskId, fileId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/tasks/${taskId}/completion-files/${fileId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading completion file:', error);
      throw error;
    }
  }

  // Download task file
  async downloadTaskFile(taskId, fileId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/tasks/${taskId}/files/${fileId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading task file:', error);
      throw error;
    }
  }

  // Ghi thời gian cho task
  async logTime(taskId, hours, description = '') {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/tasks/${taskId}/time`, {
        hours,
        description
      });
      return response.data;
    } catch (error) {
      console.error('Error logging time:', error);
      throw error;
    }
  }

  // Lấy time logs của task
  async getTimeLogs(taskId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/tasks/${taskId}/time`);
      return response.data;
    } catch (error) {
      console.error('Error fetching time logs:', error);
      throw error;
    }
  }

  // Cập nhật PO acceptance cho task
  async updatePOAcceptance(taskId, accepted) {
    try {
      const response = await axiosInstance.put(`${API_BASE_URL}/tasks/${taskId}/po-acceptance`, {
        accepted
      });
      return response.data;
    } catch (error) {
      console.error('Error updating PO acceptance:', error);
      throw error;
    }
  }
}

const taskService = new TaskService();
export default taskService;

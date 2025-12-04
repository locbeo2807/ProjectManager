import axiosInstance from '../api/axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class TaskService {
  // Get all tasks for a sprint
  async getSprintTasks(sprintId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/sprints/${sprintId}/tasks`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sprint tasks:', error);
      throw error;
    }
  }

  // Get a single task by ID
  async getTask(taskId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }

  // Create a new task
  async createTask(taskData) {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/tasks`, taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Update an existing task
  async updateTask(taskId, taskData) {
    try {
      const response = await axiosInstance.put(`${API_BASE_URL}/tasks/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Delete a task
  async deleteTask(taskId) {
    try {
      const response = await axiosInstance.delete(`${API_BASE_URL}/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Assign task to user
  async assignTask(taskId, userId) {
    try {
      const response = await axiosInstance.put(`${API_BASE_URL}/tasks/${taskId}/assign`, { userId });
      return response.data;
    } catch (error) {
      console.error('Error assigning task:', error);
      throw error;
    }
  }

  // Update task status
  async updateTaskStatus(taskId, status) {
    try {
      const response = await axiosInstance.put(`${API_BASE_URL}/tasks/${taskId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  // Add comment to task
  async addComment(taskId, comment) {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/tasks/${taskId}/comments`, { comment });
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Get task comments
  async getTaskComments(taskId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/tasks/${taskId}/comments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task comments:', error);
      throw error;
    }
  }

  // Upload file for task
  async uploadTaskFile(taskId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axiosInstance.post(`${API_BASE_URL}/tasks/${taskId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Get task files
  async getTaskFiles(taskId) {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/tasks/${taskId}/files`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task files:', error);
      throw error;
    }
  }

  // Delete task file
  async deleteTaskFile(taskId, fileId) {
    try {
      const response = await axiosInstance.delete(`${API_BASE_URL}/tasks/${taskId}/files/${fileId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting task file:', error);
      throw error;
    }
  }
}

const taskService = new TaskService();
export default taskService;

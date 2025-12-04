import axiosInstance from '../axios';

const MetricsService = {
  // SLA Metrics
  getSLAMetrics: async (projectId) => {
    const response = await axiosInstance.get(`/metrics/sla/${projectId}`);
    return response.data;
  },

  // User Productivity Metrics
  getUserProductivityMetrics: async (userId, projectId) => {
    const response = await axiosInstance.get(`/metrics/productivity/${userId}/${projectId}`);
    return response.data;
  },

  // Dashboard Metrics
  getDashboardMetrics: async (projectId) => {
    if (!projectId) {
      throw new Error('projectId is required for dashboard metrics');
    }
    const response = await axiosInstance.get(`/metrics/dashboard/${projectId}`);
    return response.data;
  },

  // Team Performance Metrics
  getTeamPerformanceMetrics: async (projectId) => {
    const response = await axiosInstance.get(`/metrics/team-performance/${projectId}`);
    return response.data;
  },

  // Quality Metrics
  getQualityMetrics: async (projectId) => {
    const response = await axiosInstance.get(`/metrics/quality/${projectId}`);
    return response.data;
  }
};

export default MetricsService;
import api from '../axios';

const getEpics = async (projectId) => {
  if (!projectId) throw new Error('projectId is required');
  const response = await api.get(`/epics/project/${projectId}`);
  return response.data;
};

const getEpicsByProject = async (projectId) => {
  const response = await api.get(`/epics/project/${projectId}`);
  return response.data;
};

const getEpic = async (id) => {
  const response = await api.get(`/epics/${id}`);
  return response.data;
};

const createEpic = async (epicData) => {
  const response = await api.post('/epics', epicData);
  return response.data;
};

const updateEpic = async (id, epicData) => {
  const response = await api.put(`/epics/${id}`, epicData);
  return response.data;
};

const deleteEpic = async (id) => {
  const response = await api.delete(`/epics/${id}`);
  return response.data;
};

const addTaskToEpic = async (epicId, taskId) => {
  const response = await api.post(`/epics/${epicId}/add-task/${taskId}`);
  return response.data;
};

const removeTaskFromEpic = async (epicId, taskId) => {
  const response = await api.delete(`/epics/${epicId}/remove-task/${taskId}`);
  return response.data;
};

export const epicService = {
  getEpics,
  getEpicsByProject,
  getEpic,
  createEpic,
  updateEpic,
  deleteEpic,
  addTaskToEpic,
  removeTaskFromEpic,
};
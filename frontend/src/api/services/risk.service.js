import api from '../axios';

const getRisks = async (projectId) => {
  if (!projectId) throw new Error('projectId is required');
  const response = await api.get(`/risks/project/${projectId}`);
  return response.data;
};

const getRisk = async (id) => {
  const response = await api.get(`/risks/${id}`);
  return response.data;
};

const createRisk = async (riskData) => {
  const response = await api.post('/risks', riskData);
  return response.data;
};

const updateRisk = async (id, riskData) => {
  const response = await api.put(`/risks/${id}`, riskData);
  return response.data;
};

const updateRiskStatus = async (id, statusData) => {
  const response = await api.put(`/risks/${id}/status`, statusData);
  return response.data;
};

const deleteRisk = async (id) => {
  const response = await api.delete(`/risks/${id}`);
  return response.data;
};

export const riskService = {
  getRisks,
  getRisk,
  createRisk,
  updateRisk,
  updateRiskStatus,
  deleteRisk,
};
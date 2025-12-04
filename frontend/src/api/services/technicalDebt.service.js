import api from '../axios';

const getTechnicalDebts = async (projectId) => {
  if (!projectId) throw new Error('projectId is required');
  const response = await api.get(`/technical-debts/project/${projectId}`);
  return response.data;
};

const getTechnicalDebtsByProject = async (projectId) => {
  const response = await api.get(`/technical-debts/project/${projectId}`);
  return response.data;
};

const getTechnicalDebt = async (id) => {
  const response = await api.get(`/technical-debts/${id}`);
  return response.data;
};

const createTechnicalDebt = async (debtData) => {
  const response = await api.post('/technical-debts', debtData);
  return response.data;
};

const updateTechnicalDebt = async (id, debtData) => {
  const response = await api.put(`/technical-debts/${id}`, debtData);
  return response.data;
};

const updateTechnicalDebtStatus = async (id, statusData) => {
  const response = await api.put(`/technical-debts/${id}/status`, statusData);
  return response.data;
};

const deleteTechnicalDebt = async (id) => {
  const response = await api.delete(`/technical-debts/${id}`);
  return response.data;
};

export const technicalDebtService = {
  getTechnicalDebts,
  getTechnicalDebtsByProject,
  getTechnicalDebt,
  createTechnicalDebt,
  updateTechnicalDebt,
  updateTechnicalDebtStatus,
  deleteTechnicalDebt,
};
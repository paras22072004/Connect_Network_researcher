import API from './api';

export const getWorkspacesApi = async () => {
  try {
    const res = await API.get('/workspaces');
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getWorkspaceByIdApi = async (id) => {
  try {
    const res = await API.get(`/workspaces/${id}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const createWorkspaceApi = async (data) => {
  try {
    const res = await API.post('/workspaces', data);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const inviteMemberApi = async (id, data) => {
  try {
    const res = await API.post(`/workspaces/${id}/members`, data);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const addTaskApi = async (id, taskData) => {
  try {
    const res = await API.post(`/workspaces/${id}/tasks`, taskData);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateTaskApi = async (id, taskId, updates) => {
  try {
    const res = await API.patch(`/workspaces/${id}/tasks/${taskId}`, updates);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deleteTaskApi = async (id, taskId) => {
  try {
    const res = await API.delete(`/workspaces/${id}/tasks/${taskId}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const addMilestoneApi = async (id, milestoneData) => {
  try {
    const res = await API.post(`/workspaces/${id}/milestones`, milestoneData);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const toggleMilestoneApi = async (id, milestoneId) => {
  try {
    const res = await API.patch(`/workspaces/${id}/milestones/${milestoneId}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const addNoteApi = async (id, noteData) => {
  try {
    const res = await API.post(`/workspaces/${id}/notes`, noteData);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deleteNoteApi = async (id, noteId) => {
  try {
    const res = await API.delete(`/workspaces/${id}/notes/${noteId}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

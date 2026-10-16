import API from './api';

export const getWorkspacesApi = async () => {
  try {
    const res = await API.get('/workspaces');
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getDiscoverableWorkspacesApi = async () => {
  try {
    const res = await API.get('/workspaces/discover');
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

export const requestWorkspaceAccessApi = async (id, data = {}) => {
  try {
    const res = await API.post(`/workspaces/${id}/request-access`, data);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const cancelWorkspaceRequestApi = async (id) => {
  try {
    const res = await API.post(`/workspaces/${id}/cancel-request`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getWorkspaceRequestsApi = async (id) => {
  try {
    const res = await API.get(`/workspaces/${id}/requests`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const respondToWorkspaceRequestApi = async (id, requestId, action) => {
  try {
    const res = await API.post(`/workspaces/${id}/requests/${requestId}/respond`, { action });
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getMyWorkspaceRequestsApi = async () => {
  try {
    const res = await API.get('/workspaces/my-requests');
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getMyWorkspaceInvitationsApi = async () => {
  try {
    const res = await API.get('/workspaces/my-invitations');
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const respondToWorkspaceInvitationApi = async (id, invitationId, action) => {
  try {
    const res = await API.post(`/workspaces/${id}/invitations/${invitationId}/respond`, { action });
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const cancelWorkspaceInvitationApi = async (id, invitationId) => {
  try {
    const res = await API.post(`/workspaces/${id}/invitations/${invitationId}/cancel`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deleteWorkspaceApi = async (id) => {
  try {
    const res = await API.delete(`/workspaces/${id}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const removeWorkspaceMemberApi = async (id, memberId) => {
  try {
    const res = await API.delete(`/workspaces/${id}/members/${memberId}`);
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

// Workspace Group Chat / Discussions
export const getWorkspaceMessagesApi = async (id) => {
  try {
    const res = await API.get(`/workspaces/${id}/messages`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const postWorkspaceMessageApi = async (id, content) => {
  try {
    const res = await API.post(`/workspaces/${id}/messages`, { content });
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Tasks
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

// Milestones
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

// Notes
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

import API from './api';

export const recommendTeammatesApi = async (projectData) => {
  try {
    const res = await API.post('/team/recommend', projectData);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const saveProjectApi = async (projectData) => {
  try {
    const res = await API.post('/team/projects', projectData);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getMyProjectsApi = async () => {
  try {
    const res = await API.get('/team/projects');
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getProjectByIdApi = async (id) => {
  try {
    const res = await API.get(`/team/projects/${id}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Inbound Join Requests (Candidate -> Owner)
export const requestToJoinProjectApi = async (projectId, data = {}) => {
  try {
    const res = await API.post(`/team/projects/${projectId}/request-join`, data);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const cancelJoinRequestApi = async (projectId) => {
  try {
    const res = await API.post(`/team/projects/${projectId}/cancel-request`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getProjectRequestsApi = async (projectId) => {
  try {
    const res = await API.get(`/team/projects/${projectId}/requests`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const respondToJoinRequestApi = async (projectId, requestId, action) => {
  try {
    const res = await API.post(`/team/projects/${projectId}/requests/${requestId}/respond`, { action });
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getMySentRequestsApi = async () => {
  try {
    const res = await API.get('/team/my-requests');
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const removeTeamMemberApi = async (projectId, memberId) => {
  try {
    const res = await API.delete(`/team/projects/${projectId}/members/${memberId}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Outbound Invitations (Owner -> Candidate)
export const inviteToProjectApi = async (projectId, data) => {
  try {
    const res = await API.post(`/team/projects/${projectId}/invite`, data);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getMyInvitationsApi = async () => {
  try {
    const res = await API.get('/team/invitations');
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const respondToInvitationApi = async (projectId, action) => {
  try {
    const res = await API.patch(`/team/invitations/${projectId}/respond`, { action });
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Lifecycle
export const finalizeTeamApi = async (projectId) => {
  try {
    const res = await API.post(`/team/projects/${projectId}/finalize`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const completeProjectApi = async (projectId) => {
  try {
    const res = await API.post(`/team/projects/${projectId}/complete`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deleteProjectApi = async (id) => {
  try {
    const res = await API.delete(`/team/projects/${id}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

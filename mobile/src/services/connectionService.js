import API from './api';

export const sendConnectionRequest = async (userId) => {
  const response = await API.post(`/connections/request/${userId}`);
  return response.data;
};

export const acceptConnectionRequest = async (connectionId) => {
  const response = await API.put(`/connections/accept/${connectionId}`);
  return response.data;
};

export const rejectConnectionRequest = async (connectionId) => {
  const response = await API.put(`/connections/reject/${connectionId}`);
  return response.data;
};

export const cancelConnectionRequest = async (connectionId) => {
  const response = await API.delete(`/connections/cancel/${connectionId}`);
  return response.data;
};

export const getAcceptedConnections = async () => {
  const response = await API.get('/connections');
  return response.data;
};

export const getConnectionRequests = async () => {
  const response = await API.get('/connections/requests');
  return response.data;
};

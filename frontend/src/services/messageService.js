import API from './api';

export const getMessages = async (userId) => {
  const response = await API.get(`/messages/${userId}`);
  return response.data;
};

export const sendMessage = async (userId, content) => {
  const response = await API.post(`/messages/${userId}`, { content });
  return response.data;
};

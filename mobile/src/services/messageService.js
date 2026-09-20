import API from './api';

export const getConversation = async (userId) => {
  const response = await API.get(`/messages/${userId}`);
  return response.data;
};

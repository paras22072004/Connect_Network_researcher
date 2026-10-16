import API from './api';

export const getConversation = async (userId) => {
  const response = await API.get(`/messages/${userId}`);
  return response.data;
};

export const uploadMessageMedia = async (formData) => {
  const response = await API.post('/messages/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const sendMessageApi = async (userId, data) => {
  const response = await API.post(`/messages/${userId}`, data);
  return response.data;
};


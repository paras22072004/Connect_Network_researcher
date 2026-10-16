import API from './api';

export const getMessages = async (userId) => {
  const response = await API.get(`/messages/${userId}`);
  return response.data;
};

export const uploadMessageMedia = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await API.post('/messages/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const sendMessage = async (userId, messageData) => {
  const payload = typeof messageData === 'string' ? { content: messageData } : messageData;
  const response = await API.post(`/messages/${userId}`, payload);
  return response.data;
};

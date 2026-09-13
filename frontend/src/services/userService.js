import API from './api';

export const getUserProfile = async () => {
  const response = await API.get('/users/profile');
  return response.data;
};

export const updateUserProfile = async (profileData) => {
  const response = await API.put('/users/profile', profileData);
  return response.data;
};

export const getUserById = async (userId) => {
  const response = await API.get(`/users/${userId}`);
  return response.data;
};

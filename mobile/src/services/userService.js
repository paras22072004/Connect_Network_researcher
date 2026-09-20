import API from './api';

export const getUserProfile = async (userId) => {
  const response = await API.get(`/users/profile/${userId}`);
  return response.data;
};

export const updateUserProfile = async (profileData) => {
  const response = await API.put('/users/profile', profileData);
  return response.data;
};

export const addPublication = async (pubData) => {
  const response = await API.post('/users/publications', pubData);
  return response.data;
};

export const deletePublication = async (pubId) => {
  const response = await API.delete(`/users/publications/${pubId}`);
  return response.data;
};

export const addProject = async (projData) => {
  const response = await API.post('/users/projects', projData);
  return response.data;
};

export const deleteProject = async (projId) => {
  const response = await API.delete(`/users/projects/${projId}`);
  return response.data;
};

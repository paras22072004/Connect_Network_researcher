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

// Project CRUD APIs
export const addProject = async (projData) => {
  const response = await API.post('/users/projects', projData);
  return response.data;
};
export const addProjectApi = addProject;

export const updateProject = async (projId, projData) => {
  const response = await API.put(`/users/projects/${projId}`, projData);
  return response.data;
};
export const updateProjectApi = updateProject;

export const deleteProject = async (projId) => {
  const response = await API.delete(`/users/projects/${projId}`);
  return response.data;
};
export const deleteProjectApi = deleteProject;

// Research Topics CRUD APIs
export const addResearchTopic = async (topicData) => {
  const response = await API.post('/users/research', topicData);
  return response.data;
};
export const addResearchTopicApi = addResearchTopic;

export const updateResearchTopic = async (topicId, topicData) => {
  const response = await API.put(`/users/research/${topicId}`, topicData);
  return response.data;
};
export const updateResearchTopicApi = updateResearchTopic;

export const deleteResearchTopic = async (topicId) => {
  const response = await API.delete(`/users/research/${topicId}`);
  return response.data;
};
export const deleteResearchTopicApi = deleteResearchTopic;

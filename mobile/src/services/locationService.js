import API from './api';

export const updateLocation = async (latitude, longitude) => {
  const response = await API.post('/location/update', { latitude, longitude });
  return response.data;
};

export const getNearbyUsers = async (radius = 1000) => {
  const response = await API.get(`/location/nearby?radius=${radius}`);
  return response.data;
};

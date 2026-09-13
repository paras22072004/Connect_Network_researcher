import API from './api';

export const updateLocation = async (latitude, longitude) => {
  const response = await API.post('/location/update', { latitude, longitude });
  return response.data;
};

export const getNearbyUsers = async (radiusMeters = 1000) => {
  const response = await API.get(`/location/nearby?radius=${radiusMeters}`);
  return response.data;
};

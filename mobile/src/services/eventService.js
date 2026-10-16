import API from './api';

export const getEventsApi = async (params = {}) => {
  try {
    const res = await API.get('/events', { params });
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getEventByIdApi = async (id) => {
  try {
    const res = await API.get(`/events/${id}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const createEventApi = async (eventData) => {
  try {
    const res = await API.post('/events', eventData);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const joinEventApi = async (id) => {
  try {
    const res = await API.post(`/events/${id}/join`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const leaveEventApi = async (id) => {
  try {
    const res = await API.post(`/events/${id}/leave`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getEventAttendeesApi = async (id) => {
  try {
    const res = await API.get(`/events/${id}/attendees/match`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

import API from './api';

export const getNotificationsApi = async () => {
  try {
    const res = await API.get('/notifications');
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const markNotificationAsReadApi = async (id) => {
  try {
    const res = await API.patch(`/notifications/${id}/read`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const markAllNotificationsAsReadApi = async () => {
  try {
    const res = await API.patch('/notifications/read-all');
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

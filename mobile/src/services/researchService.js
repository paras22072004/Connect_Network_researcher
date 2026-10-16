import API from './api';

export const searchPublicationsApi = async (query = '', domain = '') => {
  try {
    const res = await API.get('/users/publications/search', {
      params: { query, domain }
    });
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

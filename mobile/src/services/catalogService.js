import API from './api';
import { searchLocalCatalog, resolveCanonicalName } from '../constants/catalogs';

/**
 * Searches catalog items via API with instant offline local fallback.
 * @param {('skill'|'interest'|'domain')} type
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const searchCatalogApi = async (type, query = '', limit = 20) => {
  try {
    const res = await API.get('/catalog', {
      params: { type, q: query, limit }
    });
    if (res.data && res.data.success && Array.isArray(res.data.items)) {
      return res.data.items;
    }
    return searchLocalCatalog(type, query, limit);
  } catch (error) {
    // Graceful offline / fallback to local constants
    return searchLocalCatalog(type, query, limit);
  }
};

/**
 * Fetches all standardized catalogs from backend.
 */
export const getFullCatalogsApi = async () => {
  try {
    const res = await API.get('/catalog/all');
    return res.data;
  } catch (error) {
    console.warn('[CatalogService] Failed to fetch full catalogs from API:', error.message);
    return null;
  }
};

/**
 * Resolves a list of raw items to canonical entries and removes duplicates.
 * @param {('skill'|'interest'|'domain')} type
 * @param {Array<string>} items
 */
export const resolveItemsApi = async (type, items = []) => {
  try {
    const res = await API.post('/catalog/resolve', { type, items });
    return res.data;
  } catch (error) {
    // Local fallback resolution
    const uniqueMap = new Map();
    items.forEach((item) => {
      const canonical = resolveCanonicalName(type, item);
      if (canonical && !uniqueMap.has(canonical.toLowerCase())) {
        uniqueMap.set(canonical.toLowerCase(), canonical);
      }
    });
    const canonicalNames = Array.from(uniqueMap.values());
    return {
      success: true,
      canonicalNames,
      normalized: canonicalNames.map((name) => ({ name, isCustom: false }))
    };
  }
};

/**
 * Submits a custom skill, research interest, or domain suggestion.
 * @param {Object} payload { type, name, description, category }
 */
export const suggestCatalogItemApi = async (payload) => {
  try {
    const res = await API.post('/catalog/suggest', payload);
    return res.data;
  } catch (error) {
    console.error('[SuggestCatalogItem Error]:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

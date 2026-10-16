const {
  searchCatalog,
  resolveToCanonical,
  normalizeList,
  suggestCustomItem,
  getAllCatalogs
} = require('../services/catalogService');

/**
 * @desc    Get catalog items with search and filter
 * @route   GET /api/catalog
 * @access  Public
 */
const getCatalogItems = async (req, res) => {
  try {
    const { type = 'skill', q = '', limit = 25 } = req.query;

    if (!['skill', 'interest', 'domain'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid catalog type. Must be "skill", "interest", or "domain".'
      });
    }

    const items = searchCatalog(type, q, Math.min(Number(limit) || 25, 100));

    return res.json({
      success: true,
      type,
      total: items.length,
      items
    });
  } catch (error) {
    console.error('[GetCatalogItems Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all 3 standardized catalogs in full
 * @route   GET /api/catalog/all
 * @access  Public
 */
const getFullCatalogs = async (req, res) => {
  try {
    const catalogs = getAllCatalogs();
    return res.json({
      success: true,
      catalogs
    });
  } catch (error) {
    console.error('[GetFullCatalogs Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Resolve a list of raw strings to canonical entries and detect duplicates
 * @route   POST /api/catalog/resolve
 * @access  Public
 */
const resolveItems = async (req, res) => {
  try {
    const { type, items = [] } = req.body;

    if (!['skill', 'interest', 'domain'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid catalog type. Must be "skill", "interest", or "domain".'
      });
    }

    const normalized = normalizeList(type, items, { namesOnly: false });
    const canonicalNames = normalized.map((i) => i.name);

    return res.json({
      success: true,
      type,
      normalized,
      canonicalNames
    });
  } catch (error) {
    console.error('[ResolveItems Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Submit a custom catalog entry suggestion
 * @route   POST /api/catalog/suggest
 * @access  Private
 */
const suggestCatalogItem = async (req, res) => {
  try {
    const { type, name, description, category } = req.body;

    if (!['skill', 'interest', 'domain'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid catalog type. Must be "skill", "interest", or "domain".'
      });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Item name is required.'
      });
    }

    const result = await suggestCustomItem(
      type,
      { name: name.trim(), description, category },
      req.user?._id
    );

    return res.status(result.alreadyExists ? 200 : 201).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[SuggestCatalogItem Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCatalogItems,
  getFullCatalogs,
  resolveItems,
  suggestCatalogItem
};

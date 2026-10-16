const express = require('express');
const router = express.Router();
const {
  getCatalogItems,
  getFullCatalogs,
  resolveItems,
  suggestCatalogItem
} = require('../controllers/catalogController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getCatalogItems);
router.get('/all', getFullCatalogs);
router.post('/resolve', resolveItems);
router.post('/suggest', protect, suggestCatalogItem);

module.exports = router;

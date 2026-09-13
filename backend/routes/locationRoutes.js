const express = require('express');
const router = express.Router();
const { updateLocation, getNearbyUsers } = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

/**
 * Location & Nearby Discovery Endpoints
 */
router.post('/update', protect, updateLocation);
router.get('/nearby', protect, getNearbyUsers);

module.exports = router;

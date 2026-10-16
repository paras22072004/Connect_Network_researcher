const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, getUserById, searchPublications } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/publications/search', protect, searchPublications);
router.get('/:id', protect, getUserById);

module.exports = router;

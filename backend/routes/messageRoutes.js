const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, uploadMedia } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

/**
 * Direct Messaging Endpoints
 */
router.post('/upload', protect, upload.single('file'), uploadMedia);
router.get('/:userId', protect, getMessages);
router.post('/:userId', protect, sendMessage);

module.exports = router;

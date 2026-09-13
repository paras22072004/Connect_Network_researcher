const express = require('express');
const router = express.Router();
const {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  getAcceptedConnections,
  getConnectionRequests
} = require('../controllers/connectionController');
const { protect } = require('../middleware/authMiddleware');

/**
 * Networking Connection Endpoints
 */
router.post('/request/:userId', protect, sendConnectionRequest);
router.put('/accept/:connectionId', protect, acceptConnectionRequest);
router.put('/reject/:connectionId', protect, rejectConnectionRequest);
router.delete('/cancel/:connectionId', protect, cancelConnectionRequest);
router.get('/', protect, getAcceptedConnections);
router.get('/requests', protect, getConnectionRequests);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getEvents,
  getEventById,
  createEvent,
  joinEvent,
  leaveEvent,
  getEventAttendeesWithMatch
} = require('../controllers/eventController');

router.route('/')
  .get(protect, getEvents)
  .post(protect, createEvent);

router.route('/:id')
  .get(protect, getEventById);

router.post('/:id/join', protect, joinEvent);
router.post('/:id/leave', protect, leaveEvent);
router.get('/:id/attendees/match', protect, getEventAttendeesWithMatch);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getUserById,
  searchPublications,
  addProject,
  updateProject,
  deleteProject,
  addResearchTopic,
  updateResearchTopic,
  deleteResearchTopic
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// Project endpoints
router.post('/projects', protect, addProject);
router.put('/projects/:id', protect, updateProject);
router.delete('/projects/:id', protect, deleteProject);

// Research topic endpoints
router.post('/research', protect, addResearchTopic);
router.put('/research/:id', protect, updateResearchTopic);
router.delete('/research/:id', protect, deleteResearchTopic);

router.get('/publications/search', protect, searchPublications);
router.get('/:id', protect, getUserById);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  recommendTeammates,
  saveProjectRequirement,
  getMyProjectRequirements,
  getProjectById,
  inviteToProject,
  getMyInvitations,
  respondToInvitation,
  finalizeTeam,
  completeProject,
  deleteProjectRequirement
} = require('../controllers/teamController');

router.post('/recommend', protect, recommendTeammates);

router.route('/projects')
  .post(protect, saveProjectRequirement)
  .get(protect, getMyProjectRequirements);

router.route('/projects/:id')
  .get(protect, getProjectById)
  .delete(protect, deleteProjectRequirement);

router.post('/projects/:id/invite', protect, inviteToProject);
router.post('/projects/:id/finalize', protect, finalizeTeam);
router.post('/projects/:id/complete', protect, completeProject);

router.get('/invitations', protect, getMyInvitations);
router.patch('/invitations/:id/respond', protect, respondToInvitation);

module.exports = router;

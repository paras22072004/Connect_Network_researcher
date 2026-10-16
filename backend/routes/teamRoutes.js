const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  recommendTeammates,
  saveProjectRequirement,
  getMyProjectRequirements,
  getProjectById,
  requestToJoinProject,
  cancelJoinRequest,
  getProjectRequests,
  respondToJoinRequest,
  getMySentRequests,
  inviteToProject,
  getMyInvitations,
  respondToInvitation,
  removeTeamMember,
  finalizeTeam,
  completeProject,
  deleteProjectRequirement
} = require('../controllers/teamController');

// AI Teammate Recommendations
router.post('/recommend', protect, recommendTeammates);

// Projects CRUD
router.route('/projects')
  .post(protect, saveProjectRequirement)
  .get(protect, getMyProjectRequirements);

router.route('/projects/:id')
  .get(protect, getProjectById)
  .delete(protect, deleteProjectRequirement);

// Inbound Team Join Requests (Candidate -> Owner)
router.post('/projects/:id/request-join', protect, requestToJoinProject);
router.post('/projects/:id/cancel-request', protect, cancelJoinRequest);
router.get('/projects/:id/requests', protect, getProjectRequests);
router.post('/projects/:id/requests/:requestId/respond', protect, respondToJoinRequest);
router.get('/my-requests', protect, getMySentRequests);

// Member management
router.delete('/projects/:id/members/:memberId', protect, removeTeamMember);

// Outbound Invitations (Owner -> Candidate)
router.post('/projects/:id/invite', protect, inviteToProject);
router.get('/invitations', protect, getMyInvitations);
router.patch('/invitations/:id/respond', protect, respondToInvitation);

// Project Lifecycle
router.post('/projects/:id/finalize', protect, finalizeTeam);
router.post('/projects/:id/complete', protect, completeProject);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getWorkspaces,
  getDiscoverableWorkspaces,
  getWorkspaceById,
  createWorkspace,
  requestWorkspaceAccess,
  cancelWorkspaceRequest,
  getWorkspaceRequests,
  respondToWorkspaceRequest,
  removeWorkspaceMember,
  getMyWorkspaceRequests,
  getWorkspaceMessages,
  postWorkspaceMessage,
  inviteMember,
  respondToWorkspaceInvitation,
  cancelWorkspaceInvitation,
  getMyWorkspaceInvitations,
  deleteWorkspace,
  addTask,
  updateTask,
  deleteTask,
  addMilestone,
  toggleMilestone,
  addNote,
  deleteNote
} = require('../controllers/workspaceController');

// User Workspaces & Workspace Discovery
router.route('/')
  .get(protect, getWorkspaces)
  .post(protect, createWorkspace);

router.get('/discover', protect, getDiscoverableWorkspaces);
router.get('/my-requests', protect, getMyWorkspaceRequests);
router.get('/my-invitations', protect, getMyWorkspaceInvitations);

router.route('/:id')
  .get(protect, getWorkspaceById)
  .delete(protect, deleteWorkspace);

// Workspace Join Requests
router.post('/:id/request-access', protect, requestWorkspaceAccess);
router.post('/:id/cancel-request', protect, cancelWorkspaceRequest);
router.get('/:id/requests', protect, getWorkspaceRequests);
router.post('/:id/requests/:requestId/respond', protect, respondToWorkspaceRequest);

// Workspace Invitations (Owner invites candidate, candidate responds)
router.post('/:id/invitations/:invitationId/respond', protect, respondToWorkspaceInvitation);
router.post('/:id/invitations/:invitationId/cancel', protect, cancelWorkspaceInvitation);

// Members Management
router.post('/:id/members', protect, inviteMember);
router.delete('/:id/members/:memberId', protect, removeWorkspaceMember);

// Workspace Group Chat / Discussions
router.route('/:id/messages')
  .get(protect, getWorkspaceMessages)
  .post(protect, postWorkspaceMessage);

// Tasks
router.post('/:id/tasks', protect, addTask);
router.route('/:id/tasks/:taskId')
  .patch(protect, updateTask)
  .delete(protect, deleteTask);

// Milestones
router.post('/:id/milestones', protect, addMilestone);
router.patch('/:id/milestones/:mId', protect, toggleMilestone);

// Notes
router.post('/:id/notes', protect, addNote);
router.delete('/:id/notes/:noteId', protect, deleteNote);

module.exports = router;

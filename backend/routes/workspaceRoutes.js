const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getWorkspaces,
  getWorkspaceById,
  createWorkspace,
  inviteMember,
  addTask,
  updateTask,
  deleteTask,
  addMilestone,
  toggleMilestone,
  addNote,
  deleteNote
} = require('../controllers/workspaceController');

router.route('/')
  .get(protect, getWorkspaces)
  .post(protect, createWorkspace);

router.route('/:id')
  .get(protect, getWorkspaceById);

router.post('/:id/members', protect, inviteMember);
router.post('/:id/tasks', protect, addTask);
router.route('/:id/tasks/:taskId')
  .patch(protect, updateTask)
  .delete(protect, deleteTask);

router.post('/:id/milestones', protect, addMilestone);
router.patch('/:id/milestones/:mId', protect, toggleMilestone);

router.post('/:id/notes', protect, addNote);
router.delete('/:id/notes/:noteId', protect, deleteNote);

module.exports = router;

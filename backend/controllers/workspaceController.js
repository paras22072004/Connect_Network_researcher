const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Connection = require('../models/Connection');

/**
 * Helper to check if current user is owner or member of the workspace
 */
const checkAccess = (workspace, userId) => {
  if (!workspace || !userId) return false;
  const uId = userId.toString();
  if (workspace.owner && workspace.owner.toString() === uId) return true;
  return Array.isArray(workspace.members) && workspace.members.some(
    m => m.user && (m.user.toString() === uId || m.user._id?.toString() === uId)
  );
};

/**
 * @desc    Get all workspaces where user is owner or member
 * @route   GET /api/workspaces
 * @access  Private
 */
const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
      .populate('owner', 'name role organization profileImage')
      .populate('members.user', 'name role organization profileImage')
      .sort({ updatedAt: -1 });

    const formatted = workspaces.map(w => {
      const wObj = w.toObject();
      const taskCount = wObj.tasks?.length || 0;
      const completedTaskCount = wObj.tasks?.filter(t => t.status === 'Completed').length || 0;
      const milestoneCount = wObj.milestones?.length || 0;
      const completedMilestoneCount = wObj.milestones?.filter(m => m.completed).length || 0;
      const progressPercent = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

      return {
        ...wObj,
        taskCount,
        completedTaskCount,
        milestoneCount,
        completedMilestoneCount,
        progressPercent,
        isOwner: wObj.owner?._id?.toString() === req.user._id.toString()
      };
    });

    return res.json({
      success: true,
      count: formatted.length,
      workspaces: formatted
    });
  } catch (error) {
    console.error('[Get Workspaces Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single workspace details by ID (Strict access control)
 * @route   GET /api/workspaces/:id
 * @access  Private
 */
const getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name role organization profileImage email')
      .populate('members.user', 'name role organization profileImage')
      .populate('tasks.assignee', 'name role profileImage')
      .populate('notes.createdBy', 'name role profileImage');

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a member of this research workspace.'
      });
    }

    const wObj = workspace.toObject();
    const taskCount = wObj.tasks?.length || 0;
    const completedTaskCount = wObj.tasks?.filter(t => t.status === 'Completed').length || 0;
    const progressPercent = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

    return res.json({
      success: true,
      workspace: {
        ...wObj,
        taskCount,
        completedTaskCount,
        progressPercent,
        isOwner: wObj.owner?._id?.toString() === req.user._id.toString()
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new collaboration workspace
 * @route   POST /api/workspaces
 * @access  Private
 */
const createWorkspace = async (req, res) => {
  try {
    const { title, description, status = 'Planning', initialMembers = [] } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both workspace title and description.'
      });
    }

    // Owner is always added as lead member
    const members = [
      { user: req.user._id, role: 'Lead', joinedAt: new Date() }
    ];

    // Add any initial invited members
    if (Array.isArray(initialMembers)) {
      for (const m of initialMembers) {
        const uId = typeof m === 'string' ? m : m.userId;
        if (uId && uId.toString() !== req.user._id.toString()) {
          members.push({
            user: uId,
            role: m.role || 'Researcher',
            joinedAt: new Date()
          });
        }
      }
    }

    const workspace = await Workspace.create({
      title,
      description,
      status,
      owner: req.user._id,
      members,
      tasks: [],
      milestones: [],
      notes: []
    });

    const populated = await Workspace.findById(workspace._id)
      .populate('owner', 'name role organization profileImage')
      .populate('members.user', 'name role organization profileImage');

    return res.status(201).json({
      success: true,
      message: 'Research workspace created successfully!',
      workspace: populated
    });
  } catch (error) {
    console.error('[Create Workspace Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Invite accepted connection to workspace
 * @route   POST /api/workspaces/:id/members
 * @access  Private
 */
const inviteMember = async (req, res) => {
  try {
    const { userId, role = 'Researcher' } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Please provide user ID to invite.' });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to invite members to this workspace' });
    }

    // Check if already a member
    const alreadyMember = workspace.members.some(m => m.user.toString() === userId.toString());
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this workspace.' });
    }

    workspace.members.push({
      user: userId,
      role: role || 'Researcher',
      joinedAt: new Date()
    });

    await workspace.save();

    const populated = await Workspace.findById(workspace._id)
      .populate('members.user', 'name role organization profileImage');

    return res.json({
      success: true,
      message: 'Teammate added to workspace!',
      members: populated.members
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add a task to workspace
 * @route   POST /api/workspaces/:id/tasks
 * @access  Private
 */
const addTask = async (req, res) => {
  try {
    const { title, description, assignee, dueDate, priority = 'Medium' } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    workspace.tasks.push({
      title,
      description: description || '',
      assignee: assignee || req.user._id,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      status: 'To Do'
    });

    await workspace.save();

    const updated = await Workspace.findById(workspace._id)
      .populate('tasks.assignee', 'name role profileImage');

    return res.status(201).json({
      success: true,
      message: 'Task added successfully',
      tasks: updated.tasks
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update task status or details
 * @route   PATCH /api/workspaces/:id/tasks/:taskId
 * @access  Private
 */
const updateTask = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const task = workspace.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const { status, title, description, priority, assignee } = req.body;
    if (status !== undefined) task.status = status;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (assignee !== undefined) task.assignee = assignee;

    await workspace.save();

    const updated = await Workspace.findById(workspace._id)
      .populate('tasks.assignee', 'name role profileImage');

    return res.json({
      success: true,
      message: 'Task updated successfully',
      tasks: updated.tasks
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/workspaces/:id/tasks/:taskId
 * @access  Private
 */
const deleteTask = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    workspace.tasks = workspace.tasks.filter(t => t._id.toString() !== req.params.taskId);
    await workspace.save();

    return res.json({
      success: true,
      message: 'Task deleted successfully',
      tasks: workspace.tasks
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add project milestone
 * @route   POST /api/workspaces/:id/milestones
 * @access  Private
 */
const addMilestone = async (req, res) => {
  try {
    const { title, targetDate } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Milestone title is required.' });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    workspace.milestones.push({
      title,
      targetDate: targetDate ? new Date(targetDate) : null,
      completed: false
    });

    await workspace.save();

    return res.status(201).json({
      success: true,
      message: 'Milestone added successfully',
      milestones: workspace.milestones
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Toggle milestone completion
 * @route   PATCH /api/workspaces/:id/milestones/:mId
 * @access  Private
 */
const toggleMilestone = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const m = workspace.milestones.id(req.params.mId);
    if (!m) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    m.completed = !m.completed;
    await workspace.save();

    return res.json({
      success: true,
      message: 'Milestone updated',
      milestones: workspace.milestones
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add shared research note or link
 * @route   POST /api/workspaces/:id/notes
 * @access  Private
 */
const addNote = async (req, res) => {
  try {
    const { title, content, linkUrl } = req.body;
    if (!title && !content) {
      return res.status(400).json({ success: false, message: 'Note title or content is required.' });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    workspace.notes.push({
      title: title || 'Research Note',
      content: content || '',
      linkUrl: linkUrl || '',
      createdBy: req.user._id
    });

    await workspace.save();

    const updated = await Workspace.findById(workspace._id)
      .populate('notes.createdBy', 'name role profileImage');

    return res.status(201).json({
      success: true,
      message: 'Note shared with team',
      notes: updated.notes
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete shared note
 * @route   DELETE /api/workspaces/:id/notes/:noteId
 * @access  Private
 */
const deleteNote = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    workspace.notes = workspace.notes.filter(n => n._id.toString() !== req.params.noteId);
    await workspace.save();

    return res.json({
      success: true,
      message: 'Note removed',
      notes: workspace.notes
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};

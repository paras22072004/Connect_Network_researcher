const Workspace = require('../models/Workspace');
const ProjectRequirement = require('../models/ProjectRequirement');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Notification = require('../models/Notification');
const { createNotification } = require('../services/notificationService');

/**
 * Helper to check if current user is owner or member of the workspace
 */
const checkAccess = (workspace, userId) => {
  if (!workspace || !userId) return false;
  const uId = userId.toString();
  if (workspace.owner && (workspace.owner.toString() === uId || workspace.owner._id?.toString() === uId)) return true;
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
      .populate('joinRequests.user', 'name role organization profileImage skills email')
      .populate('invitations.user', 'name role organization profileImage skills email')
      .populate('invitations.invitedBy', 'name role organization profileImage')
      .populate('project', 'title status researchDomain')
      .sort({ updatedAt: -1 });

    const formatted = workspaces.map(w => {
      const wObj = w.toObject();
      const taskCount = wObj.tasks?.length || 0;
      const completedTaskCount = wObj.tasks?.filter(t => t.status === 'Completed').length || 0;
      const milestoneCount = wObj.milestones?.length || 0;
      const completedMilestoneCount = wObj.milestones?.filter(m => m.completed).length || 0;
      const progressPercent = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;
      const pendingRequestCount = wObj.joinRequests?.filter(r => r.status === 'pending').length || 0;
      const pendingInvitationCount = wObj.invitations?.filter(i => i.status === 'pending').length || 0;

      return {
        ...wObj,
        taskCount,
        completedTaskCount,
        milestoneCount,
        completedMilestoneCount,
        progressPercent,
        pendingRequestCount,
        pendingInvitationCount,
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
 * @desc    Discover public workspaces where current user is NOT a member
 * @route   GET /api/workspaces/discover
 * @access  Private
 */
const getDiscoverableWorkspaces = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find active public workspaces where user is not owner and not in members
    const workspaces = await Workspace.find({
      owner: { $ne: currentUserId },
      'members.user': { $ne: currentUserId },
      isPublic: true
    })
      .populate('owner', 'name role organization profileImage')
      .populate('project', 'title researchDomain collaborationType desiredTeamSize')
      .sort({ createdAt: -1 });

    const formatted = workspaces.map(w => {
      const wObj = w.toObject();
      const memberCount = wObj.members?.length || 1;
      const taskCount = wObj.tasks?.length || 0;
      const completedTaskCount = wObj.tasks?.filter(t => t.status === 'Completed').length || 0;
      const progressPercent = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

      // Check if current user has an active/pending join request
      const myRequest = wObj.joinRequests?.find(
        r => r.user?.toString() === currentUserId.toString()
      );

      // Do NOT expose private tasks, notes, or discussions
      return {
        _id: wObj._id,
        title: wObj.title,
        description: wObj.description,
        status: wObj.status,
        owner: wObj.owner,
        project: wObj.project,
        tags: wObj.tags || [],
        memberCount,
        taskCount,
        progressPercent,
        createdAt: wObj.createdAt,
        myRequestStatus: myRequest?.status || null,
        myRequestId: myRequest?._id || null
      };
    });

    return res.json({
      success: true,
      count: formatted.length,
      workspaces: formatted
    });
  } catch (error) {
    console.error('[Discover Workspaces Error]:', error);
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
      .populate('notes.createdBy', 'name role profileImage')
      .populate('discussions.sender', 'name role profileImage')
      .populate('joinRequests.user', 'name role organization profileImage skills email')
      .populate('invitations.user', 'name role organization profileImage skills email')
      .populate('invitations.invitedBy', 'name role organization profileImage')
      .populate('project', 'title status researchDomain desiredTeamSize finalTeam');

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
    const pendingRequestCount = wObj.joinRequests?.filter(r => r.status === 'pending').length || 0;
    const pendingInvitationCount = wObj.invitations?.filter(i => i.status === 'pending').length || 0;

    return res.json({
      success: true,
      workspace: {
        ...wObj,
        taskCount,
        completedTaskCount,
        progressPercent,
        pendingRequestCount,
        pendingInvitationCount,
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
    const { title, description, status = 'In Progress', initialMembers = [], tags = [] } = req.body;

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

    // Any initial collaborators become pending invitations rather than direct additions
    const invitations = [];
    if (Array.isArray(initialMembers)) {
      for (const m of initialMembers) {
        const uId = typeof m === 'string' ? m : m.userId;
        if (uId && uId.toString() !== req.user._id.toString()) {
          invitations.push({
            user: uId,
            invitedBy: req.user._id,
            role: m.role || 'Researcher',
            status: 'pending',
            createdAt: new Date()
          });
        }
      }
    }

    const workspace = await Workspace.create({
      title,
      description,
      status,
      owner: req.user._id,
      isPublic: true,
      tags,
      members,
      invitations,
      tasks: [],
      milestones: [],
      notes: [],
      discussions: [
        {
          sender: req.user._id,
          content: `Welcome to the ${title} workspace collaboration group!`
        }
      ]
    });

    // Send notifications to any invited members
    for (const inv of invitations) {
      try {
        await createNotification({
          recipient: inv.user,
          sender: req.user._id,
          type: 'workspace_invitation',
          title: 'Workspace Invitation',
          message: `${req.user.name || 'Organizer'} invited you to join workspace "${workspace.title}".`,
          workspace: workspace._id
        });
      } catch (notifErr) {
        console.warn('[Workspace Create Notification Warn]:', notifErr.message);
      }
    }

    const populated = await Workspace.findById(workspace._id)
      .populate('owner', 'name role organization profileImage')
      .populate('members.user', 'name role organization profileImage')
      .populate('invitations.user', 'name role organization profileImage skills email')
      .populate('invitations.invitedBy', 'name role organization profileImage');

    return res.status(201).json({
      success: true,
      message: 'Research workspace created successfully!',
      workspace: populated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Request to join an existing workspace
 * @route   POST /api/workspaces/:id/request-access
 * @access  Private
 */
const requestWorkspaceAccess = async (req, res) => {
  try {
    const { role = 'Researcher', message = '' } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    const currentUserId = req.user._id.toString();

    // 1. Cannot request if already owner or member
    if (checkAccess(workspace, currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member or owner of this workspace.'
      });
    }

    // 2. Check for duplicate active/pending request
    const existingReq = workspace.joinRequests?.find(
      r => r.user?.toString() === currentUserId && r.status === 'pending'
    );
    if (existingReq) {
      return res.status(400).json({
        success: false,
        message: 'A pending access request already exists for this workspace.'
      });
    }

    // 3. Add join request
    workspace.joinRequests.push({
      user: req.user._id,
      role: role.trim() || 'Researcher',
      message: message.trim(),
      status: 'pending',
      createdAt: new Date()
    });

    await workspace.save();

    const createdReq = workspace.joinRequests[workspace.joinRequests.length - 1];

    // 4. Notify workspace organizer/owner
    await createNotification({
      recipient: workspace.owner,
      sender: req.user._id,
      type: 'workspace_join_request',
      title: 'New Workspace Join Request',
      message: `${req.user.name || 'A researcher'} requested access to workspace "${workspace.title}".`,
      workspace: workspace._id,
      requestId: createdReq._id
    });

    return res.status(201).json({
      success: true,
      message: 'Workspace access request sent to organizer.',
      request: createdReq
    });
  } catch (error) {
    console.error('[Request Workspace Access Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Cancel a pending workspace access request
 * @route   POST /api/workspaces/:id/cancel-request
 * @access  Private
 */
const cancelWorkspaceRequest = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    const currentUserId = req.user._id.toString();
    const reqItem = workspace.joinRequests?.find(
      r => r.user?.toString() === currentUserId && r.status === 'pending'
    );

    if (!reqItem) {
      return res.status(404).json({
        success: false,
        message: 'No pending request found to cancel.'
      });
    }

    reqItem.status = 'cancelled';
    reqItem.respondedAt = new Date();
    await workspace.save();

    return res.json({
      success: true,
      message: 'Workspace access request cancelled.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all join requests for a workspace (Organizer only)
 * @route   GET /api/workspaces/:id/requests
 * @access  Private
 */
const getWorkspaceRequests = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('joinRequests.user', 'name role organization profileImage skills email');

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace organizer can view requests.'
      });
    }

    return res.json({
      success: true,
      requests: workspace.joinRequests || []
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Organizer Accepts or Rejects Workspace Join Request
 * @route   POST /api/workspaces/:id/requests/:requestId/respond
 * @access  Private
 */
const respondToWorkspaceRequest = async (req, res) => {
  try {
    const { action } = req.body; // 'accept' | 'reject'
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be accept or reject.' });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only workspace organizer can respond to requests.' });
    }

    const reqItem = workspace.joinRequests?.id(req.params.requestId);
    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (reqItem.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${reqItem.status}.`
      });
    }

    if (action === 'accept') {
      reqItem.status = 'accepted';
      reqItem.respondedAt = new Date();

      // Add to workspace members idempotently
      const alreadyMember = workspace.members.some(
        m => m.user?.toString() === reqItem.user.toString()
      );
      if (!alreadyMember) {
        workspace.members.push({
          user: reqItem.user,
          role: reqItem.role || 'Researcher',
          joinedAt: new Date()
        });
      }

      // Synchronize with linked project if one exists
      if (workspace.project) {
        const project = await ProjectRequirement.findById(workspace.project);
        if (project) {
          const inFinal = project.finalTeam?.some(
            m => m.user?.toString() === reqItem.user.toString()
          );
          if (!inFinal) {
            project.finalTeam.push({
              user: reqItem.user,
              role: reqItem.role || 'Researcher',
              joinedAt: new Date()
            });
            await project.save();
          }
        }
      }

      await workspace.save();

      // Notify requester
      await createNotification({
        recipient: reqItem.user,
        sender: req.user._id,
        type: 'workspace_request_accepted',
        title: 'Workspace Access Granted!',
        message: `Your request to join workspace "${workspace.title}" has been approved.`,
        workspace: workspace._id,
        requestId: reqItem._id
      });

      return res.json({
        success: true,
        message: 'Workspace access granted.',
        workspace
      });
    } else {
      reqItem.status = 'rejected';
      reqItem.respondedAt = new Date();
      await workspace.save();

      // Notify requester
      await createNotification({
        recipient: reqItem.user,
        sender: req.user._id,
        type: 'workspace_request_rejected',
        title: 'Workspace Access Request Declined',
        message: `Your request to join "${workspace.title}" was declined by the organizer.`,
        workspace: workspace._id,
        requestId: reqItem._id
      });

      return res.json({
        success: true,
        message: 'Request rejected.',
        request: reqItem
      });
    }
  } catch (error) {
    console.error('[Respond To Workspace Request Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remove a member from workspace and linked project (Organizer only)
 * @route   DELETE /api/workspaces/:id/members/:memberId
 * @access  Private
 */
const removeWorkspaceMember = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only workspace organizer can remove members.' });
    }

    const memberId = req.params.memberId;
    if (memberId === workspace.owner.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove the workspace organizer.' });
    }

    // 1. Remove from workspace.members
    workspace.members = workspace.members.filter(
      m => m.user?.toString() !== memberId
    );

    // 2. If linked to project, remove from project.finalTeam
    if (workspace.project) {
      await ProjectRequirement.findByIdAndUpdate(workspace.project, {
        $pull: { finalTeam: { user: memberId } }
      });
    }

    await workspace.save();

    // 3. Notify removed user
    await createNotification({
      recipient: memberId,
      sender: req.user._id,
      type: 'member_removed',
      title: 'Workspace Access Removed',
      message: `Your membership in workspace "${workspace.title}" was revoked by the organizer.`,
      workspace: workspace._id
    });

    return res.json({
      success: true,
      message: 'Member removed and access revoked.',
      members: workspace.members
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all workspace join requests sent by current user
 * @route   GET /api/workspaces/my-requests
 * @access  Private
 */
const getMyWorkspaceRequests = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'joinRequests.user': req.user._id
    })
      .populate('owner', 'name role organization profileImage email')
      .sort({ updatedAt: -1 });

    const requests = [];
    workspaces.forEach(ws => {
      const myReqs = ws.joinRequests?.filter(
        r => r.user?.toString() === req.user._id.toString()
      ) || [];

      myReqs.forEach(r => {
        requests.push({
          requestId: r._id,
          workspaceId: ws._id,
          workspaceTitle: ws.title,
          workspaceDescription: ws.description,
          owner: ws.owner,
          requestedRole: r.role,
          message: r.message,
          status: r.status,
          createdAt: r.createdAt,
          respondedAt: r.respondedAt
        });
      });
    });

    return res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get workspace group chat / discussions
 * @route   GET /api/workspaces/:id/messages
 * @access  Private (Members only)
 */
const getWorkspaceMessages = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('discussions.sender', 'name role profileImage');

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You must be a workspace member to view discussions.'
      });
    }

    return res.json({
      success: true,
      discussions: workspace.discussions || [],
      messages: workspace.discussions || []
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Post a message in workspace group chat
 * @route   POST /api/workspaces/:id/messages
 * @access  Private (Members only)
 */
const postWorkspaceMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You must be a workspace member to post discussions.'
      });
    }

    workspace.discussions.push({
      sender: req.user._id,
      content: content.trim(),
      createdAt: new Date()
    });

    await workspace.save();

    const populated = await Workspace.findById(workspace._id)
      .populate('discussions.sender', 'name role profileImage');

    const createdMsg = populated.discussions[populated.discussions.length - 1];

    // Broadcast in real-time to workspace room if Socket.io is active
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`workspace_${workspace._id}`).emit('receive_workspace_message', createdMsg);
      }
    } catch (ioErr) {
      console.warn('[Socket broadcast workspace message warning]:', ioErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Message posted.',
      discussion: createdMsg,
      data: createdMsg
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Invite a member to the workspace (Sends pending invitation)
 * @route   POST /api/workspaces/:id/members
 * @access  Private (Organizer only)
 */
const inviteMember = async (req, res) => {
  try {
    const { userId, role = 'Researcher' } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot invite yourself to your own workspace.' });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only workspace owner can invite members.' });
    }

    const alreadyMember = workspace.members.some(
      m => m.user?.toString() === userId.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this workspace.' });
    }

    // Check if there is already a pending invitation
    if (!workspace.invitations) workspace.invitations = [];
    const existingInvite = workspace.invitations.find(
      i => i.user?.toString() === userId.toString() && i.status === 'pending'
    );
    if (existingInvite) {
      return res.status(400).json({ success: false, message: 'An invitation has already been sent to this user.' });
    }

    workspace.invitations.push({
      user: userId,
      invitedBy: req.user._id,
      role: role.trim() || 'Researcher',
      status: 'pending',
      createdAt: new Date()
    });

    await workspace.save();

    // Notify invited member
    await createNotification({
      recipient: userId,
      sender: req.user._id,
      type: 'workspace_invitation',
      title: 'Workspace Invitation',
      message: `${req.user.name || 'Organizer'} invited you to join workspace "${workspace.title}".`,
      workspace: workspace._id
    });

    const populated = await Workspace.findById(workspace._id)
      .populate('members.user', 'name role organization profileImage')
      .populate('invitations.user', 'name role organization profileImage skills email')
      .populate('invitations.invitedBy', 'name role organization profileImage');

    return res.json({
      success: true,
      message: 'Invitation sent to user successfully! They will be added once they accept.',
      invitations: populated.invitations,
      members: populated.members
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Invitee responds to a workspace invitation (Accept or Decline)
 * @route   POST /api/workspaces/:id/invitations/:invitationId/respond
 * @access  Private (Invitee only)
 */
const respondToWorkspaceInvitation = async (req, res) => {
  try {
    const { action } = req.body; // 'accept' | 'reject'
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be accept or reject.' });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    const inviteItem = workspace.invitations?.id(req.params.invitationId);
    if (!inviteItem) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    if (inviteItem.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to respond to this invitation.' });
    }

    if (inviteItem.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This invitation has already been ${inviteItem.status}.`
      });
    }

    if (action === 'accept') {
      inviteItem.status = 'accepted';
      inviteItem.respondedAt = new Date();

      // Add to workspace members idempotently
      const alreadyMember = workspace.members.some(
        m => m.user?.toString() === req.user._id.toString()
      );
      if (!alreadyMember) {
        workspace.members.push({
          user: req.user._id,
          role: inviteItem.role || 'Researcher',
          joinedAt: new Date()
        });
      }

      // Synchronize with linked project if one exists
      if (workspace.project) {
        const project = await ProjectRequirement.findById(workspace.project);
        if (project) {
          const inFinal = project.finalTeam?.some(
            m => m.user?.toString() === req.user._id.toString()
          );
          if (!inFinal) {
            project.finalTeam.push({
              user: req.user._id,
              role: inviteItem.role || 'Researcher',
              joinedAt: new Date()
            });
            await project.save();
          }
        }
      }

      await workspace.save();

      // Notify workspace owner
      await createNotification({
        recipient: workspace.owner,
        sender: req.user._id,
        type: 'workspace_invitation_accepted',
        title: 'Workspace Invitation Accepted!',
        message: `${req.user.name || 'A researcher'} accepted your invitation to join "${workspace.title}".`,
        workspace: workspace._id
      });

      return res.json({
        success: true,
        message: 'You have successfully joined the workspace!',
        workspace
      });
    } else {
      inviteItem.status = 'rejected';
      inviteItem.respondedAt = new Date();
      await workspace.save();

      // Notify workspace owner
      await createNotification({
        recipient: workspace.owner,
        sender: req.user._id,
        type: 'workspace_invitation_declined',
        title: 'Workspace Invitation Declined',
        message: `${req.user.name || 'A researcher'} declined your invitation to join "${workspace.title}".`,
        workspace: workspace._id
      });

      return res.json({
        success: true,
        message: 'Workspace invitation declined.',
        invitation: inviteItem
      });
    }
  } catch (error) {
    console.error('[Respond To Workspace Invitation Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Owner cancels a pending workspace invitation
 * @route   POST /api/workspaces/:id/invitations/:invitationId/cancel
 * @access  Private (Owner only)
 */
const cancelWorkspaceInvitation = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only workspace owner can cancel invitations.' });
    }

    const inviteItem = workspace.invitations?.id(req.params.invitationId);
    if (!inviteItem) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    if (inviteItem.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot cancel an invitation that is already ${inviteItem.status}.` });
    }

    inviteItem.status = 'cancelled';
    inviteItem.respondedAt = new Date();
    await workspace.save();

    return res.json({
      success: true,
      message: 'Workspace invitation cancelled.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all workspace invitations received by current user
 * @route   GET /api/workspaces/my-invitations
 * @access  Private
 */
const getMyWorkspaceInvitations = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'invitations.user': req.user._id
    })
      .populate('owner', 'name role organization profileImage email')
      .populate('invitations.invitedBy', 'name role organization profileImage')
      .sort({ updatedAt: -1 });

    const invitations = [];
    workspaces.forEach(ws => {
      const myInvites = ws.invitations?.filter(
        i => i.user?.toString() === req.user._id.toString()
      ) || [];

      myInvites.forEach(inv => {
        invitations.push({
          invitationId: inv._id,
          workspaceId: ws._id,
          workspaceTitle: ws.title,
          workspaceDescription: ws.description,
          owner: ws.owner,
          role: inv.role,
          status: inv.status,
          createdAt: inv.createdAt,
          respondedAt: inv.respondedAt
        });
      });
    });

    return res.json({
      success: true,
      count: invitations.length,
      invitations
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete workspace (Owner only)
 * @route   DELETE /api/workspaces/:id
 * @access  Private (Owner only)
 */
const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only workspace organizer can delete this workspace.' });
    }

    // 1. If linked to project, unlink it
    if (workspace.project) {
      await ProjectRequirement.findByIdAndUpdate(workspace.project, {
        $set: { workspace: null }
      });
    }

    // 2. Clean up notifications for this workspace
    await Notification.deleteMany({ workspace: workspace._id });

    // 3. Delete workspace
    await Workspace.findByIdAndDelete(workspace._id);

    return res.json({
      success: true,
      message: 'Workspace deleted successfully.'
    });
  } catch (error) {
    console.error('[Delete Workspace Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add a task to the workspace
 * @route   POST /api/workspaces/:id/tasks
 * @access  Private (Members only)
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
      return res.status(403).json({ success: false, message: 'Access denied: Must be a member to add tasks.' });
    }

    workspace.tasks.push({
      title: title.trim(),
      description: description ? description.trim() : '',
      assignee: assignee || req.user._id,
      dueDate: dueDate || null,
      priority,
      status: 'To Do'
    });

    await workspace.save();

    const populated = await Workspace.findById(workspace._id)
      .populate('tasks.assignee', 'name role profileImage');

    return res.status(201).json({
      success: true,
      message: 'Task added successfully!',
      tasks: populated.tasks
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update task status or details
 * @route   PATCH /api/workspaces/:id/tasks/:taskId
 * @access  Private (Members only)
 */
const updateTask = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const task = workspace.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const { status, title, description, priority, assignee, dueDate } = req.body;
    if (status) task.status = status;
    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority) task.priority = priority;
    if (assignee) task.assignee = assignee;
    if (dueDate) task.dueDate = dueDate;

    await workspace.save();

    const populated = await Workspace.findById(workspace._id)
      .populate('tasks.assignee', 'name role profileImage');

    return res.json({
      success: true,
      message: 'Task updated!',
      tasks: populated.tasks
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/workspaces/:id/tasks/:taskId
 * @access  Private (Members only)
 */
const deleteTask = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    workspace.tasks = workspace.tasks.filter(
      t => t._id.toString() !== req.params.taskId
    );

    await workspace.save();

    return res.json({
      success: true,
      message: 'Task deleted successfully!',
      tasks: workspace.tasks
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add a milestone
 * @route   POST /api/workspaces/:id/milestones
 * @access  Private (Members only)
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
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    workspace.milestones.push({
      title: title.trim(),
      targetDate: targetDate || null,
      completed: false
    });

    await workspace.save();

    return res.status(201).json({
      success: true,
      message: 'Milestone added!',
      milestones: workspace.milestones
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Toggle milestone completion
 * @route   PATCH /api/workspaces/:id/milestones/:mId
 * @access  Private (Members only)
 */
const toggleMilestone = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const milestone = workspace.milestones.id(req.params.mId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    milestone.completed = !milestone.completed;
    await workspace.save();

    return res.json({
      success: true,
      message: `Milestone marked as ${milestone.completed ? 'completed' : 'pending'}!`,
      milestones: workspace.milestones
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add a collaborative note or research link
 * @route   POST /api/workspaces/:id/notes
 * @access  Private (Members only)
 */
const addNote = async (req, res) => {
  try {
    const { title, content, linkUrl } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Note title is required.' });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    workspace.notes.push({
      title: title.trim(),
      content: content ? content.trim() : '',
      linkUrl: linkUrl ? linkUrl.trim() : '',
      createdBy: req.user._id
    });

    await workspace.save();

    const populated = await Workspace.findById(workspace._id)
      .populate('notes.createdBy', 'name role profileImage');

    return res.status(201).json({
      success: true,
      message: 'Note added!',
      notes: populated.notes
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a note
 * @route   DELETE /api/workspaces/:id/notes/:noteId
 * @access  Private (Members only)
 */
const deleteNote = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    if (!checkAccess(workspace, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    workspace.notes = workspace.notes.filter(
      n => n._id.toString() !== req.params.noteId
    );

    await workspace.save();

    return res.json({
      success: true,
      message: 'Note deleted!',
      notes: workspace.notes
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};

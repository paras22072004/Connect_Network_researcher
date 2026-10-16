const ProjectRequirement = require('../models/ProjectRequirement');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Workspace = require('../models/Workspace');
const { createNotification } = require('../services/notificationService');
const { generateEmbedding, cosineSimilarity, normalizeSemanticScore, ensureUserEmbedding } = require('../services/aiEmbeddingService');
const { calculateHaversineDistanceMeters, formatApproximateDistance } = require('../utils/distanceCalculator');
const { normalizeList, resolveToCanonical } = require('../services/catalogService');

/**
 * Canonical catalog array intersection helper.
 * Resolves aliases and checks exact canonical matching.
 */
const findMatches = (listA = [], listB = [], type = 'skill') => {
  if (!Array.isArray(listA) || !Array.isArray(listB) || listA.length === 0 || listB.length === 0) return [];
  const normA = normalizeList(type, listA, { namesOnly: false });
  const normB = normalizeList(type, listB, { namesOnly: false });

  const mapA = new Map();
  normA.forEach((item) => mapA.set(item.id, item.name));

  const matches = [];
  const seen = new Set();
  normB.forEach((item) => {
    if (mapA.has(item.id) && !seen.has(item.id)) {
      seen.add(item.id);
      matches.push(mapA.get(item.id));
    }
  });

  return matches;
};

/**
 * @desc    Recommend teammates for a research or technical project using AI semantic matching & complementary skills
 * @route   POST /api/team/recommend
 * @access  Private
 */
const recommendTeammates = async (req, res) => {
  try {
    const {
      title,
      description,
      requiredSkills = [],
      researchDomain = '',
      desiredRoles = [],
      collaborationType = 'Research Paper',
      projectId = null
    } = req.body;

    if (!title && !description && (!requiredSkills || requiredSkills.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least a project title, description, or required skills.'
      });
    }

    const currentUser = await User.findById(req.user._id);
    const [userLng, userLat] = currentUser?.location?.coordinates || [0, 0];
    const hasUserLocation = userLng !== 0 || userLat !== 0;

    // 1. Build normalized project description text for AI embedding
    const projectTextParts = [];
    if (title) projectTextParts.push(`Project Title: ${title}.`);
    if (description) projectTextParts.push(`Description: ${description}.`);
    if (researchDomain) projectTextParts.push(`Research Domain: ${researchDomain}.`);
    if (Array.isArray(requiredSkills) && requiredSkills.length > 0) {
      projectTextParts.push(`Required Skills: ${requiredSkills.join(', ')}.`);
    }
    if (Array.isArray(desiredRoles) && desiredRoles.length > 0) {
      projectTextParts.push(`Desired Roles: ${desiredRoles.join(', ')}.`);
    }
    if (collaborationType) projectTextParts.push(`Collaboration Type: ${collaborationType}.`);

    const projectText = projectTextParts.join(' ');

    // 2. Generate real semantic embedding vector for this project
    let projectEmbedding = null;
    try {
      projectEmbedding = await generateEmbedding(projectText);
    } catch (err) {
      console.warn('[TeamBuilder] AI embedding failed for project text, fallback to rule-based:', err.message);
    }

    // 3. Fetch candidate users from database (exclude current user)
    const candidates = await User.find({
      _id: { $ne: req.user._id },
      discoverable: true
    }).select('-password +aiProfileEmbedding');

    // 4. Fetch existing connection statuses with candidates
    const userConnections = await Connection.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    });

    const connectionMap = {};
    userConnections.forEach(conn => {
      const otherId = conn.sender.toString() === req.user._id.toString()
        ? conn.receiver.toString()
        : conn.sender.toString();
      connectionMap[otherId] = {
        connectionId: conn._id,
        status: conn.status,
        isSender: conn.sender.toString() === req.user._id.toString()
      };
    });

    // 4b. If projectId provided, check current membership / invitation / join request status
    let activeProject = null;
    if (projectId) {
      activeProject = await ProjectRequirement.findById(projectId);
    }

    // 5. Evaluate and score each candidate
    const recommendations = await Promise.all(candidates.map(async (candidate) => {
      const candObj = candidate.toObject();

      // Ensure candidate has semantic embedding
      let candEmbedding = candidate.aiProfileEmbedding;
      if (!Array.isArray(candEmbedding) || candEmbedding.length === 0) {
        candEmbedding = await ensureUserEmbedding(candidate);
      }

      // (A) Semantic Similarity with Project Concept (45% weight)
      let semanticScore = 50;
      let rawCosine = null;
      if (Array.isArray(projectEmbedding) && Array.isArray(candEmbedding) && projectEmbedding.length > 0 && candEmbedding.length > 0) {
        try {
          rawCosine = cosineSimilarity(projectEmbedding, candEmbedding);
          semanticScore = normalizeSemanticScore(rawCosine);
        } catch (e) {
          semanticScore = 50;
        }
      }

      // (B) Complementary Skill Coverage (25% weight)
      const candSkills = Array.isArray(candObj.skills) ? candObj.skills : [];
      const matchedSkills = findMatches(requiredSkills, candSkills, 'skill');
      let skillScore = 20;
      if (requiredSkills.length > 0) {
        const ratio = matchedSkills.length / requiredSkills.length;
        skillScore = Math.min(Math.round(ratio * 100), 100);
      } else if (candSkills.length > 0) {
        skillScore = 60;
      }

      // (C) Desired Role Fulfillment (20% weight)
      let roleScore = 30;
      let roleMatched = false;
      if (Array.isArray(desiredRoles) && desiredRoles.length > 0 && candObj.role) {
        const roleLower = candObj.role.toLowerCase().trim();
        const matchesAnyDesired = desiredRoles.some(r => {
          const rLower = String(r).toLowerCase().trim();
          return roleLower.includes(rLower) || rLower.includes(roleLower);
        });
        if (matchesAnyDesired) {
          roleScore = 100;
          roleMatched = true;
        }
      }

      // (D) Research Domain Alignment (10% weight)
      let domainScore = 30;
      let domainMatched = false;
      if (researchDomain) {
        const canonicalTarget = resolveToCanonical('domain', researchDomain);
        const candInterestsAndDomains = [
          ...(candObj.researchInterests || []),
          ...(candObj.researchDomains || []),
          ...((candObj.researchTopics || []).map((t) => t.domain).filter(Boolean))
        ];
        const normalizedCandDomains = normalizeList('domain', candInterestsAndDomains, { namesOnly: false });
        if (canonicalTarget && normalizedCandDomains.some((d) => d.id === canonicalTarget.id)) {
          domainMatched = true;
          domainScore = 100;
        } else {
          const candInterests = candInterestsAndDomains.map((s) => String(s).toLowerCase().trim());
          const targetDomain = researchDomain.toLowerCase().trim();
          domainMatched = candInterests.some((item) => item.includes(targetDomain) || targetDomain.includes(item));
          if (domainMatched) {
            domainScore = 100;
          }
        }
      }

      // Composite Compatibility Formula
      const compatibilityScore = Math.round(
        (semanticScore * 0.45) +
        (skillScore * 0.25) +
        (roleScore * 0.20) +
        (domainScore * 0.10)
      );

      // Distance estimation
      let approximateDistance = 'Nearby';
      const [candLng, candLat] = candObj.location?.coordinates || [0, 0];
      if (hasUserLocation && (candLng !== 0 || candLat !== 0)) {
        const meters = calculateHaversineDistanceMeters(userLat, userLng, candLat, candLng);
        approximateDistance = formatApproximateDistance(meters);
      }

      // Recommendation reasoning summary
      const reasons = [];
      if (semanticScore >= 80) reasons.push('Strong conceptual alignment');
      if (matchedSkills.length > 0) reasons.push(`Matches ${matchedSkills.slice(0, 2).join(', ')}`);
      if (roleMatched) reasons.push(`Fits role: ${candObj.role}`);
      if (domainMatched) reasons.push(`Active in ${researchDomain}`);
      const recommendationReason = reasons.length > 0 ? reasons.join(' • ') : 'Compatible multidisciplinary background';

      const connectionInfo = connectionMap[candidate._id.toString()] || { status: 'none' };

      // Status in current active project if provided
      let projectMemberStatus = 'none'; // 'none' | 'invited' | 'accepted' | 'requested'
      if (activeProject) {
        const isFinal = activeProject.finalTeam?.some(m => m.user?.toString() === candidate._id.toString());
        if (isFinal) {
          projectMemberStatus = 'accepted';
        } else {
          const inv = activeProject.invitations?.find(i => i.user?.toString() === candidate._id.toString());
          if (inv && inv.status === 'invited') {
            projectMemberStatus = 'invited';
          } else {
            const reqItem = activeProject.joinRequests?.find(r => r.user?.toString() === candidate._id.toString() && r.status === 'pending');
            if (reqItem) {
              projectMemberStatus = 'requested';
            }
          }
        }
      }

      // Sanitize private coordinates
      delete candObj.location;
      delete candObj.aiProfileEmbedding;
      delete candObj.aiProfileText;

      return {
        ...candObj,
        compatibilityScore,
        semanticScore,
        matchedSkills,
        matchedRole: roleMatched,
        matchedDomain: domainMatched,
        recommendationReason,
        approximateDistance,
        connectionStatus: connectionInfo.status,
        connectionId: connectionInfo.connectionId || null,
        isSender: connectionInfo.isSender || false,
        projectMemberStatus
      };
    }));

    // Sort highest compatibility first
    recommendations.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    return res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    console.error('[Recommend Teammates Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Save a project requirement to user's profile and automatically create/link a Workspace
 * @route   POST /api/team/projects
 * @access  Private
 */
const saveProjectRequirement = async (req, res) => {
  try {
    const {
      title,
      description,
      requiredSkills = [],
      researchDomain = '',
      desiredRoles = [],
      collaborationType = 'Research Paper',
      desiredTeamSize = 4,
      projectGoals = '',
      timeline = '',
      workspaceId = null
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Project title and description are required.'
      });
    }

    // 1. Create project requirement
    const project = new ProjectRequirement({
      owner: req.user._id,
      title,
      description,
      requiredSkills,
      researchDomain,
      desiredRoles,
      collaborationType,
      desiredTeamSize: Number(desiredTeamSize) || 4,
      projectGoals,
      timeline,
      status: 'Recruiting',
      finalTeam: [{ user: req.user._id, role: 'Lead', joinedAt: new Date() }]
    });

    // 2. Automatically create or link exactly one associated Workspace
    let workspace = null;
    if (workspaceId) {
      workspace = await Workspace.findById(workspaceId);
    }

    if (!workspace) {
      workspace = await Workspace.create({
        title: `${title} Workspace`,
        description,
        owner: req.user._id,
        project: project._id,
        status: 'In Progress',
        isPublic: true,
        tags: [researchDomain, collaborationType].filter(Boolean),
        members: [
          { user: req.user._id, role: 'Lead', joinedAt: new Date() }
        ],
        tasks: [
          {
            title: 'Project Kickoff & Objective Alignment',
            description: projectGoals || 'Review research requirements, assign roles, and align on timeline.',
            assignee: req.user._id,
            status: 'To Do',
            priority: 'High'
          },
          {
            title: 'Literature Review & Architecture Design',
            description: 'Synthesize related work and prepare foundational architecture.',
            assignee: req.user._id,
            status: 'To Do',
            priority: 'Medium'
          }
        ],
        milestones: [
          {
            title: 'Team Formation Completed',
            completed: false
          },
          {
            title: 'Initial Deliverable / Prototype Review',
            completed: false
          }
        ],
        discussions: [
          {
            sender: req.user._id,
            content: `Welcome to the ${title} workspace collaboration group! Use this space for team chat, milestones, and shared files.`
          }
        ]
      });
    } else {
      workspace.project = project._id;
      await workspace.save();
    }

    project.workspace = workspace._id;
    await project.save();

    const populatedProject = await ProjectRequirement.findById(project._id)
      .populate('owner', 'name role organization profileImage email')
      .populate('finalTeam.user', 'name role organization profileImage skills')
      .populate('workspace');

    return res.status(201).json({
      success: true,
      message: 'Project created and workspace linked successfully.',
      project: populatedProject,
      workspace
    });
  } catch (error) {
    console.error('[Save Project Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get current user's saved project requirements with full populated members, workspace, and tasks
 * @route   GET /api/team/projects
 * @access  Private
 */
const getMyProjectRequirements = async (req, res) => {
  try {
    const projects = await ProjectRequirement.find({
      $or: [
        { owner: req.user._id },
        { 'finalTeam.user': req.user._id }
      ]
    })
      .populate('owner', 'name role organization profileImage email')
      .populate('invitations.user', 'name role organization profileImage skills')
      .populate('joinRequests.user', 'name role organization profileImage skills')
      .populate('finalTeam.user', 'name role organization profileImage skills')
      .populate({
        path: 'workspace',
        populate: [
          { path: 'members.user', select: 'name role organization profileImage' },
          { path: 'tasks.assignee', select: 'name role profileImage' }
        ]
      })
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single project details by ID
 * @route   GET /api/team/projects/:id
 * @access  Private
 */
const getProjectById = async (req, res) => {
  try {
    const project = await ProjectRequirement.findById(req.params.id)
      .populate('owner', 'name role organization profileImage email')
      .populate('invitations.user', 'name role organization profileImage skills')
      .populate('joinRequests.user', 'name role organization profileImage skills')
      .populate('finalTeam.user', 'name role organization profileImage skills')
      .populate({
        path: 'workspace',
        populate: [
          { path: 'members.user', select: 'name role organization profileImage' },
          { path: 'tasks.assignee', select: 'name role profileImage' }
        ]
      });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    return res.json({ success: true, project });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Request to join a team project (Candidate -> Project Owner)
 * @route   POST /api/team/projects/:id/request-join
 * @access  Private
 */
const requestToJoinProject = async (req, res) => {
  try {
    const { role = 'Researcher', message = '' } = req.body;
    const project = await ProjectRequirement.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const currentUserId = req.user._id.toString();

    // 1. Owner cannot request to join own project
    if (project.owner.toString() === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Project owners cannot request to join their own project.'
      });
    }

    // 2. Cannot request if already a team member
    const alreadyMember = project.finalTeam?.some(
      m => m.user?.toString() === currentUserId
    );
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already an accepted member of this team.'
      });
    }

    // 3. Check capacity
    const maxCapacity = project.desiredTeamSize || 4;
    if (project.finalTeam?.length >= maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'This team has already reached maximum capacity.'
      });
    }

    // 4. Check for existing active/pending request
    const existingActiveRequest = project.joinRequests?.find(
      r => r.user?.toString() === currentUserId && r.status === 'pending'
    );
    if (existingActiveRequest) {
      return res.status(400).json({
        success: false,
        message: 'A pending join request already exists for this project.'
      });
    }

    // 5. Add join request
    project.joinRequests.push({
      user: req.user._id,
      role: role.trim() || 'Researcher',
      message: message.trim(),
      status: 'pending',
      createdAt: new Date()
    });

    await project.save();

    const createdReq = project.joinRequests[project.joinRequests.length - 1];

    // 6. Notify project owner
    await createNotification({
      recipient: project.owner,
      sender: req.user._id,
      type: 'team_join_request',
      title: 'New Team Join Request',
      message: `${req.user.name || 'A researcher'} requested to join your project "${project.title}".`,
      project: project._id,
      requestId: createdReq._id
    });

    return res.status(201).json({
      success: true,
      message: 'Join request submitted successfully. The project owner has been notified.',
      request: createdReq
    });
  } catch (error) {
    console.error('[Request To Join Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Cancel a pending join request to a project
 * @route   POST /api/team/projects/:id/cancel-request
 * @access  Private
 */
const cancelJoinRequest = async (req, res) => {
  try {
    const project = await ProjectRequirement.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const currentUserId = req.user._id.toString();
    const activeReq = project.joinRequests?.find(
      r => r.user?.toString() === currentUserId && r.status === 'pending'
    );

    if (!activeReq) {
      return res.status(404).json({
        success: false,
        message: 'No pending join request found to cancel.'
      });
    }

    activeReq.status = 'cancelled';
    activeReq.respondedAt = new Date();
    await project.save();

    return res.json({
      success: true,
      message: 'Your join request was cancelled.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all join requests for a project (Owner only)
 * @route   GET /api/team/projects/:id/requests
 * @access  Private
 */
const getProjectRequests = async (req, res) => {
  try {
    const project = await ProjectRequirement.findById(req.params.id)
      .populate('joinRequests.user', 'name role organization profileImage skills email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can view team join requests.' });
    }

    return res.json({
      success: true,
      requests: project.joinRequests || []
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Owner Accepts or Rejects a Team Join Request
 * @route   POST /api/team/projects/:id/requests/:requestId/respond
 * @access  Private
 */
const respondToJoinRequest = async (req, res) => {
  try {
    const { action } = req.body; // 'accept' | 'reject'
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be accept or reject.' });
    }

    const project = await ProjectRequirement.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can respond to join requests.' });
    }

    const reqItem = project.joinRequests?.id(req.params.requestId);
    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Join request not found.' });
    }

    if (reqItem.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${reqItem.status}.`
      });
    }

    if (action === 'accept') {
      // Re-verify capacity
      const maxCapacity = project.desiredTeamSize || 4;
      if (project.finalTeam?.length >= maxCapacity) {
        return res.status(400).json({
          success: false,
          message: 'Cannot accept request: Team has reached maximum capacity.'
        });
      }

      reqItem.status = 'accepted';
      reqItem.respondedAt = new Date();

      // Add to project final team (ensure idempotence)
      const alreadyMember = project.finalTeam?.some(
        m => m.user?.toString() === reqItem.user.toString()
      );
      if (!alreadyMember) {
        project.finalTeam.push({
          user: reqItem.user,
          role: reqItem.role || 'Researcher',
          joinedAt: new Date()
        });
      }

      // Synchronize associated Workspace membership automatically!
      let workspace = null;
      if (project.workspace) {
        workspace = await Workspace.findById(project.workspace);
      }
      if (!workspace) {
        // Create workspace if missing
        workspace = await Workspace.create({
          title: `${project.title} Workspace`,
          description: project.description,
          owner: project.owner,
          project: project._id,
          status: 'In Progress',
          members: [
            { user: project.owner, role: 'Lead', joinedAt: new Date() }
          ],
          tasks: [],
          milestones: [],
          discussions: []
        });
        project.workspace = workspace._id;
      }

      const wsMemberExists = workspace.members?.some(
        m => m.user?.toString() === reqItem.user.toString()
      );
      if (!wsMemberExists) {
        workspace.members.push({
          user: reqItem.user,
          role: reqItem.role || 'Researcher',
          joinedAt: new Date()
        });
        await workspace.save();
      }

      // Check if team is now filled
      if (project.finalTeam.length >= (project.desiredTeamSize || 4)) {
        project.status = 'TeamFormed';
      }

      await project.save();

      // Notify the requester
      await createNotification({
        recipient: reqItem.user,
        sender: req.user._id,
        type: 'team_request_accepted',
        title: 'Team Request Accepted!',
        message: `Congratulations! Your request to join "${project.title}" has been accepted. You now have full access to the project workspace and group chat.`,
        project: project._id,
        workspace: project.workspace,
        requestId: reqItem._id
      });

      return res.json({
        success: true,
        message: 'Join request accepted. User added to team and granted workspace access.',
        request: reqItem,
        project
      });
    } else {
      // Reject action
      reqItem.status = 'rejected';
      reqItem.respondedAt = new Date();
      await project.save();

      // Notify the requester
      await createNotification({
        recipient: reqItem.user,
        sender: req.user._id,
        type: 'team_request_rejected',
        title: 'Team Request Declined',
        message: `Your request to join "${project.title}" was declined by the project owner.`,
        project: project._id,
        requestId: reqItem._id
      });

      return res.json({
        success: true,
        message: 'Join request rejected.',
        request: reqItem
      });
    }
  } catch (error) {
    console.error('[Respond To Join Request Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all join requests sent by the current user
 * @route   GET /api/team/my-requests
 * @access  Private
 */
const getMySentRequests = async (req, res) => {
  try {
    const projects = await ProjectRequirement.find({
      'joinRequests.user': req.user._id
    })
      .populate('owner', 'name role organization profileImage email')
      .sort({ updatedAt: -1 });

    const requests = [];
    projects.forEach(proj => {
      const myReqs = proj.joinRequests?.filter(
        r => r.user?.toString() === req.user._id.toString()
      ) || [];

      myReqs.forEach(r => {
        requests.push({
          requestId: r._id,
          projectId: proj._id,
          projectTitle: proj.title,
          projectDescription: proj.description,
          researchDomain: proj.researchDomain,
          collaborationType: proj.collaborationType,
          desiredTeamSize: proj.desiredTeamSize,
          owner: proj.owner,
          requestedRole: r.role,
          message: r.message,
          status: r.status,
          createdAt: r.createdAt,
          respondedAt: r.respondedAt,
          workspaceId: proj.workspace || null
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
 * @desc    Invite a user to a project (Owner -> Candidate)
 * @route   POST /api/team/projects/:id/invite
 * @access  Private
 */
const inviteToProject = async (req, res) => {
  try {
    const { userId, role = 'Researcher' } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required to invite.' });
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot invite yourself to your own project.' });
    }

    const project = await ProjectRequirement.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can invite teammates.' });
    }

    // Check capacity
    const maxCapacity = project.desiredTeamSize || 4;
    if (project.finalTeam?.length >= maxCapacity) {
      return res.status(400).json({ success: false, message: 'Team has already reached maximum capacity.' });
    }

    // Check if already invited or already on final team
    const existingInvite = project.invitations?.find(inv => inv.user.toString() === userId.toString());
    if (existingInvite) {
      if (existingInvite.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'User is already an accepted team member.' });
      }
      if (existingInvite.status === 'invited') {
        return res.status(400).json({ success: false, message: 'User has already been invited.' });
      }
      existingInvite.status = 'invited';
      existingInvite.role = role;
      existingInvite.invitedAt = new Date();
    } else {
      project.invitations.push({
        user: userId,
        role: role || 'Researcher',
        status: 'invited',
        invitedAt: new Date()
      });
    }

    await project.save();

    // Send notification
    await createNotification({
      recipient: userId,
      sender: req.user._id,
      type: 'team_invite',
      title: 'Project Team Invitation',
      message: `${req.user.name || 'A researcher'} invited you to join "${project.title}".`,
      project: project._id
    });

    const populated = await ProjectRequirement.findById(project._id)
      .populate('invitations.user', 'name role organization profileImage skills')
      .populate('finalTeam.user', 'name role organization profileImage skills');

    return res.json({
      success: true,
      message: 'Invitation sent successfully.',
      invitations: populated.invitations,
      project: populated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all project invitations received by current user
 * @route   GET /api/team/invitations
 * @access  Private
 */
const getMyInvitations = async (req, res) => {
  try {
    const projects = await ProjectRequirement.find({
      'invitations.user': req.user._id
    })
      .populate('owner', 'name role organization profileImage email')
      .populate('finalTeam.user', 'name role organization profileImage')
      .sort({ updatedAt: -1 });

    const invitations = projects.map(proj => {
      const myInvite = proj.invitations.find(
        inv => inv.user.toString() === req.user._id.toString()
      );
      return {
        projectId: proj._id,
        projectTitle: proj.title,
        projectDescription: proj.description,
        collaborationType: proj.collaborationType,
        researchDomain: proj.researchDomain,
        requiredSkills: proj.requiredSkills,
        projectStatus: proj.status,
        owner: proj.owner,
        myRole: myInvite?.role || 'Researcher',
        invitationStatus: myInvite?.status || 'invited',
        invitedAt: myInvite?.invitedAt,
        finalTeamCount: proj.finalTeam?.length || 0,
        workspaceId: proj.workspace || null
      };
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
 * @desc    Accept or Decline a project invitation
 * @route   PATCH /api/team/invitations/:id/respond
 * @access  Private
 */
const respondToInvitation = async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'decline'
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be accept or decline.' });
    }

    const project = await ProjectRequirement.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const invite = project.invitations?.find(
      inv => inv.user.toString() === req.user._id.toString()
    );

    if (!invite) {
      return res.status(404).json({ success: false, message: 'No invitation found for this user.' });
    }

    invite.status = action === 'accept' ? 'accepted' : 'declined';
    invite.respondedAt = new Date();

    if (action === 'accept') {
      const alreadyInTeam = project.finalTeam?.some(
        m => m.user.toString() === req.user._id.toString()
      );
      if (!alreadyInTeam) {
        project.finalTeam.push({
          user: req.user._id,
          role: invite.role || 'Researcher',
          joinedAt: new Date()
        });
      }

      // If workspace is active, also add user to workspace members
      if (project.workspace) {
        const ws = await Workspace.findById(project.workspace);
        if (ws) {
          const wsMemberExists = ws.members?.some(
            m => m.user.toString() === req.user._id.toString()
          );
          if (!wsMemberExists) {
            ws.members.push({
              user: req.user._id,
              role: invite.role || 'Researcher',
              joinedAt: new Date()
            });
            await ws.save();
          }
        }
      }

      // Notify project owner
      await createNotification({
        recipient: project.owner,
        sender: req.user._id,
        type: 'team_invite_accepted',
        title: 'Invitation Accepted',
        message: `${req.user.name || 'A teammate'} accepted your invitation to join "${project.title}".`,
        project: project._id
      });
    } else {
      // Declined
      await createNotification({
        recipient: project.owner,
        sender: req.user._id,
        type: 'team_invite_declined',
        title: 'Invitation Declined',
        message: `${req.user.name || 'A user'} declined your invitation to join "${project.title}".`,
        project: project._id
      });
    }

    await project.save();

    const populated = await ProjectRequirement.findById(project._id)
      .populate('owner', 'name role organization profileImage')
      .populate('finalTeam.user', 'name role organization profileImage skills');

    return res.json({
      success: true,
      message: action === 'accept' ? 'You joined the project team!' : 'Invitation declined.',
      project: populated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remove a member from team and linked workspace (Owner only)
 * @route   DELETE /api/team/projects/:id/members/:memberId
 * @access  Private
 */
const removeTeamMember = async (req, res) => {
  try {
    const project = await ProjectRequirement.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can remove team members.' });
    }

    const memberId = req.params.memberId;
    if (memberId === project.owner.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove the project owner.' });
    }

    // 1. Remove from finalTeam
    project.finalTeam = project.finalTeam.filter(
      m => m.user?.toString() !== memberId
    );

    // 2. Remove from Workspace members immediately (revoking access)
    if (project.workspace) {
      await Workspace.findByIdAndUpdate(project.workspace, {
        $pull: { members: { user: memberId } }
      });
    }

    await project.save();

    // 3. Notify removed member
    await createNotification({
      recipient: memberId,
      sender: req.user._id,
      type: 'member_removed',
      title: 'Team Membership Updated',
      message: `You were removed from "${project.title}".`,
      project: project._id
    });

    return res.json({
      success: true,
      message: 'Member removed and workspace access revoked.',
      finalTeam: project.finalTeam
    });
  } catch (error) {
    console.error('[Remove Team Member Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Finalize the team and launch or connect the research workspace
 * @route   POST /api/team/projects/:id/finalize
 * @access  Private
 */
const finalizeTeam = async (req, res) => {
  try {
    const project = await ProjectRequirement.findById(req.params.id)
      .populate('owner', 'name role organization')
      .populate('finalTeam.user', 'name role organization');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can finalize the team.' });
    }

    // Ensure owner is included in final team if not already present
    const ownerInTeam = project.finalTeam.some(
      m => m.user?._id?.toString() === req.user._id.toString() || m.user?.toString() === req.user._id.toString()
    );
    if (!ownerInTeam) {
      project.finalTeam.unshift({
        user: req.user._id,
        role: 'Lead',
        joinedAt: new Date()
      });
    }

    // Create linked Workspace if not already created
    let workspace = null;
    if (project.workspace) {
      workspace = await Workspace.findById(project.workspace);
    }

    if (!workspace) {
      const workspaceMembers = [
        { user: req.user._id, role: 'Lead', joinedAt: new Date() }
      ];

      project.finalTeam.forEach(member => {
        const uId = member.user?._id || member.user;
        if (uId && uId.toString() !== req.user._id.toString()) {
          workspaceMembers.push({
            user: uId,
            role: member.role || 'Researcher',
            joinedAt: new Date()
          });
        }
      });

      workspace = await Workspace.create({
        title: `${project.title} Workspace`,
        description: project.description,
        owner: req.user._id,
        project: project._id,
        status: 'In Progress',
        members: workspaceMembers,
        tasks: [
          {
            title: 'Project Kickoff & Objective Alignment',
            description: project.projectGoals || 'Review research requirements, assign roles, and align on timeline.',
            assignee: req.user._id,
            status: 'To Do',
            priority: 'High'
          }
        ],
        milestones: [
          {
            title: 'Team Formation Completed',
            completed: true
          }
        ],
        discussions: [
          {
            sender: req.user._id,
            content: `Welcome to the ${project.title} workspace collaboration group!`
          }
        ]
      });

      project.workspace = workspace._id;
    }

    project.status = 'WorkspaceActive';
    await project.save();

    const populatedProject = await ProjectRequirement.findById(project._id)
      .populate('owner', 'name role organization profileImage')
      .populate('finalTeam.user', 'name role organization profileImage skills')
      .populate({
        path: 'workspace',
        populate: [
          { path: 'members.user', select: 'name role organization profileImage' },
          { path: 'tasks.assignee', select: 'name role profileImage' }
        ]
      });

    return res.json({
      success: true,
      message: 'Team finalized! Research workspace launched.',
      project: populatedProject,
      workspace
    });
  } catch (error) {
    console.error('[Finalize Team Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Mark the project and linked workspace as Completed
 * @route   POST /api/team/projects/:id/complete
 * @access  Private
 */
const completeProject = async (req, res) => {
  try {
    const project = await ProjectRequirement.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can mark the project as completed.' });
    }

    project.status = 'Completed';
    project.completedAt = new Date();
    await project.save();

    if (project.workspace) {
      await Workspace.findByIdAndUpdate(project.workspace, {
        status: 'Completed'
      });
    }

    return res.json({
      success: true,
      message: '🎉 Project successfully completed and archived with full deliverable milestones!',
      project
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a project requirement
 * @route   DELETE /api/team/projects/:id
 * @access  Private
 */
const deleteProjectRequirement = async (req, res) => {
  try {
    const project = await ProjectRequirement.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this project' });
    }
    await project.deleteOne();
    return res.json({ success: true, message: 'Project requirement removed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};

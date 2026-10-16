const ProjectRequirement = require('../models/ProjectRequirement');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Workspace = require('../models/Workspace');
const { generateEmbedding, cosineSimilarity, normalizeSemanticScore, ensureUserEmbedding } = require('../services/aiEmbeddingService');
const { calculateHaversineDistanceMeters, formatApproximateDistance } = require('../utils/distanceCalculator');

/**
 * Case-insensitive array intersection helper
 */
const findMatches = (listA = [], listB = []) => {
  if (!Array.isArray(listA) || !Array.isArray(listB)) return [];
  const setA = new Set(listA.map(item => String(item).toLowerCase().trim()));
  return listB.filter(item => setA.has(String(item).toLowerCase().trim()));
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
      collaborationType = 'Research Paper'
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
      const matchedSkills = findMatches(requiredSkills, candSkills);
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
        const candInterests = [
          ...(candObj.researchInterests || []),
          ...(candObj.researchDomains || [])
        ].map(s => String(s).toLowerCase().trim());

        const targetDomain = researchDomain.toLowerCase().trim();
        domainMatched = candInterests.some(item => item.includes(targetDomain) || targetDomain.includes(item));
        if (domainMatched) {
          domainScore = 100;
        }
      }

      // Synthesize Final Teammate Compatibility Score
      const compatibilityScore = Math.min(
        Math.max(
          Math.round(
            semanticScore * 0.45 +
            skillScore * 0.25 +
            roleScore * 0.20 +
            domainScore * 0.10
          ),
          15
        ),
        99
      );

      // Build structured reasons based on actual candidate data
      const reasonParts = [];
      if (matchedSkills.length > 0) {
        reasonParts.push(`Matches skills: ${matchedSkills.slice(0, 3).join(', ')}`);
      }
      if (roleMatched) {
        reasonParts.push(`Fulfills role: ${candObj.role}`);
      }
      if (domainMatched) {
        reasonParts.push(`Active in ${researchDomain}`);
      }
      if (semanticScore >= 70) {
        reasonParts.push(`Strong semantic alignment (${semanticScore}%) with project goals`);
      }

      const recommendationReason = reasonParts.length > 0
        ? reasonParts.join(' • ')
        : 'Complementary background suitable for multi-disciplinary collaboration.';

      // Location proximity (privacy-safe approximate distance)
      let approximateDistance = 'Location undisclosed';
      if (hasUserLocation && candObj.location?.coordinates && candObj.location.coordinates.length >= 2) {
        const [candLng, candLat] = candObj.location.coordinates;
        if (candLng !== 0 || candLat !== 0) {
          const exactDistance = calculateHaversineDistanceMeters(userLat, userLng, candLat, candLng);
          approximateDistance = formatApproximateDistance(exactDistance);
        }
      }

      const connectionInfo = connectionMap[candObj._id.toString()] || { status: 'none' };

      // Strip sensitive internal fields
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
        isSender: connectionInfo.isSender || false
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
 * @desc    Save a project requirement to user's profile
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
      collaborationType = 'Research Paper'
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Project title and description are required.'
      });
    }

    const project = await ProjectRequirement.create({
      owner: req.user._id,
      title,
      description,
      requiredSkills,
      researchDomain,
      desiredRoles,
      collaborationType,
      status: 'Recruiting'
    });

    return res.status(201).json({
      success: true,
      message: 'Project requirements saved successfully.',
      project
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
 * @desc    Invite a user to a project
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

      // If workspace is already active, also add user to workspace members
      if (project.workspace) {
        const ws = await Workspace.findById(project.workspace);
        if (ws) {
          const wsMemberExists = ws.members?.some(
            m => m.user.toString() === req.user._id.toString()
          );
          if (!wsMemberExists) {
            ws.members.push({
              user: req.user._id,
              role: 'Researcher',
              joinedAt: new Date()
            });
            await ws.save();
          }
        }
      }
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
        status: 'In Progress',
        members: workspaceMembers,
        tasks: [
          {
            title: 'Project Kickoff & Objective Alignment',
            description: 'Review research requirements, assign roles, and align on timeline.',
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
            completed: true
          },
          {
            title: 'Initial Deliverable / Prototype Review',
            completed: false
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
  inviteToProject,
  getMyInvitations,
  respondToInvitation,
  finalizeTeam,
  completeProject,
  deleteProjectRequirement
};

const User = require('../models/User');
const { updateUserEmbedding } = require('../services/aiEmbeddingService');
const { normalizeList, resolveToCanonical } = require('../services/catalogService');

/**
 * @desc    Get logged in user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update user profile information, research portfolio, and privacy settings
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const {
      name,
      avatarId,
      profileImage,
      role,
      organization,
      bio,
      skills,
      expertise,
      researchInterests,
      researchTopics,
      researchDomains,
      projects,
      publications,
      collaboration,
      discoverable,
      preferredRadius
    } = req.body;

    // Helper for array fields
    const parseArray = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
      return undefined;
    };

    if (name !== undefined) user.name = name;
    if (avatarId !== undefined) user.avatarId = avatarId;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (role !== undefined) user.role = role;
    if (organization !== undefined) user.organization = organization;
    if (bio !== undefined) user.bio = bio;

    if (skills !== undefined) user.skills = normalizeList('skill', parseArray(skills) || [], { namesOnly: true });
    if (expertise !== undefined) user.expertise = parseArray(expertise);
    if (researchDomains !== undefined) user.researchDomains = normalizeList('domain', parseArray(researchDomains) || [], { namesOnly: true });

    // Handle researchTopics and researchInterests
    if (researchTopics !== undefined) {
      if (Array.isArray(researchTopics)) {
        const seenTitles = new Set();
        const cleanTopics = [];
        for (const t of researchTopics) {
          if (!t || !t.title || !t.title.trim()) {
            return res.status(400).json({ success: false, message: 'Research topic title is required.' });
          }
          const titleLower = t.title.trim().toLowerCase();
          if (seenTitles.has(titleLower)) {
            return res.status(400).json({ success: false, message: `Duplicate research topic: "${t.title.trim()}"` });
          }
          seenTitles.add(titleLower);

          const canonicalDomain = resolveToCanonical('domain', t.domain)?.name || (t.domain || '').trim();
          const cleanSkills = normalizeList('skill', Array.isArray(t.skills) ? t.skills : (typeof t.skills === 'string' ? t.skills.split(',') : []), { namesOnly: true });

          cleanTopics.push({
            _id: t._id,
            title: t.title.trim(),
            domain: canonicalDomain,
            description: (t.description || '').trim(),
            skills: cleanSkills
          });
        }
        user.researchTopics = cleanTopics;
        user.researchInterests = cleanTopics.map(t => t.title);
      }
    } else if (researchInterests !== undefined) {
      const parsed = normalizeList('interest', parseArray(researchInterests) || [], { namesOnly: true });
      user.researchInterests = parsed;
      // If user had no researchTopics, populate basic entries
      if (!Array.isArray(user.researchTopics) || user.researchTopics.length === 0) {
        user.researchTopics = parsed.map(title => ({
          title,
          domain: '',
          description: '',
          skills: []
        }));
      }
    }

    // Handle projects with validation and URL check
    if (projects !== undefined) {
      if (Array.isArray(projects)) {
        const seenTitles = new Set();
        const cleanProjects = [];
        const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;

        for (const p of projects) {
          if (!p || !p.title || !p.title.trim()) {
            return res.status(400).json({ success: false, message: 'Project title is required.' });
          }
          const titleLower = p.title.trim().toLowerCase();
          if (seenTitles.has(titleLower)) {
            return res.status(400).json({ success: false, message: `Duplicate project: "${p.title.trim()}"` });
          }
          seenTitles.add(titleLower);

          let link = (p.link || '').trim();
          if (link && !urlPattern.test(link)) {
            return res.status(400).json({ success: false, message: `Invalid project URL for "${p.title.trim()}". Please provide a valid link (e.g. https://github.com/...)` });
          }

          const canonicalDomain = resolveToCanonical('domain', p.domain)?.name || (p.domain || '').trim();
          const cleanTech = normalizeList('skill', Array.isArray(p.techStack) ? p.techStack : (typeof p.techStack === 'string' ? p.techStack.split(',') : []), { namesOnly: true });

          cleanProjects.push({
            _id: p._id,
            title: p.title.trim(),
            description: (p.description || '').trim(),
            domain: canonicalDomain,
            techStack: cleanTech,
            status: p.status || 'In Progress',
            link
          });
        }
        user.projects = cleanProjects;
      }
    }

    if (publications !== undefined) user.publications = publications;
    if (collaboration !== undefined) user.collaboration = collaboration;

    if (discoverable !== undefined) user.discoverable = Boolean(discoverable);
    if (preferredRadius !== undefined) user.preferredRadius = Number(preferredRadius);

    const updatedUser = await user.save();

    // Asynchronously update AI semantic embedding in background
    updateUserEmbedding(updatedUser).catch(err =>
      console.error('[UpdateProfile] Embedding update failed:', err.message)
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('[Update Profile Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get user profile by User ID (Sanitizes location data for privacy)
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // PRIVACY ENFORCEMENT: Remove exact GeoJSON location before sending response to client
    const userObj = user.toObject();
    delete userObj.location;

    return res.json({ success: true, user: userObj });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const { calculateMatchScore } = require('../services/matchService');
const { ensureUserEmbedding } = require('../services/aiEmbeddingService');

/**
 * @desc    Search and discover research publications across stored user profiles
 * @route   GET /api/users/publications/search
 * @access  Private
 */
const searchPublications = async (req, res) => {
  try {
    const { query = '', domain = '' } = req.query;
    const currentUser = await User.findById(req.user._id).select('+aiProfileEmbedding');
    let currentUserEmbedding = currentUser?.aiProfileEmbedding;
    if (!Array.isArray(currentUserEmbedding) || currentUserEmbedding.length === 0) {
      currentUserEmbedding = await ensureUserEmbedding(currentUser);
    }

    // Query users who have at least one publication
    const filter = {
      'publications.0': { $exists: true }
    };

    const usersWithPubs = await User.find(filter).select('-password +aiProfileEmbedding');

    const results = [];
    const qLower = query.toLowerCase().trim();
    const domainLower = domain.toLowerCase().trim();

    for (const u of usersWithPubs) {
      const userObj = u.toObject();
      const matchResult = calculateMatchScore(currentUser, userObj, {
        exactDistanceMeters: 500,
        radiusMeters: 1000,
        vecA: currentUserEmbedding,
        vecB: u.aiProfileEmbedding
      });

      for (const pub of u.publications || []) {
        const titleMatch = !qLower || pub.title.toLowerCase().includes(qLower);
        const abstractMatch = !qLower || (pub.abstract && pub.abstract.toLowerCase().includes(qLower));
        const keywordMatch = !qLower || (Array.isArray(pub.keywords) && pub.keywords.some(k => k.toLowerCase().includes(qLower)));
        const venueMatch = !qLower || (pub.publicationVenue && pub.publicationVenue.toLowerCase().includes(qLower));

        const domainMatch = !domainLower || (pub.domain && pub.domain.toLowerCase().includes(domainLower)) ||
          (Array.isArray(u.researchDomains) && u.researchDomains.some(d => d.toLowerCase().includes(domainLower)));

        if ((titleMatch || abstractMatch || keywordMatch || venueMatch) && domainMatch) {
          results.push({
            publication: pub,
            author: {
              _id: u._id,
              name: u.name,
              role: u.role,
              organization: u.organization,
              profileImage: u.profileImage,
              skills: u.skills || [],
              researchInterests: u.researchInterests || []
            },
            authorMatchScore: matchResult.matchScore,
            authorMatchExplanation: matchResult.matchExplanation
          });
        }
      }
    }

    // Sort by highest match score
    results.sort((a, b) => b.authorMatchScore - a.authorMatchScore);

    return res.json({
      success: true,
      count: results.length,
      publications: results
    });
  } catch (error) {
    console.error('[Search Publications Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add a project to user profile
 * @route   POST /api/users/projects
 * @access  Private
 */
const addProject = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { title, description, domain, techStack, status, link } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Project title is required.' });
    }

    const titleTrimmed = title.trim();
    if (user.projects.some(p => p.title.toLowerCase() === titleTrimmed.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'A project with this title already exists.' });
    }

    const trimmedLink = (link || '').trim();
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;
    if (trimmedLink && !urlPattern.test(trimmedLink)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid project URL (e.g. https://github.com/...)' });
    }

    const canonicalDomain = resolveToCanonical('domain', domain)?.name || (domain || '').trim();
    const cleanTech = normalizeList('skill', Array.isArray(techStack) ? techStack : (typeof techStack === 'string' ? techStack.split(',') : []), { namesOnly: true });

    const newProject = {
      title: titleTrimmed,
      description: (description || '').trim(),
      domain: canonicalDomain,
      techStack: cleanTech,
      status: status || 'In Progress',
      link: trimmedLink
    };

    user.projects.push(newProject);
    await user.save();

    updateUserEmbedding(user).catch(err => console.error('[AddProject Embedding]', err.message));

    return res.status(201).json({
      success: true,
      message: 'Project added successfully',
      projects: user.projects,
      project: user.projects[user.projects.length - 1]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a project on user profile
 * @route   PUT /api/users/projects/:id
 * @access  Private
 */
const updateProject = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const project = user.projects.id(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const { title, description, domain, techStack, status, link } = req.body;
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: 'Project title cannot be empty.' });
      }
      const titleTrimmed = title.trim();
      const duplicate = user.projects.some(p => p._id.toString() !== req.params.id && p.title.toLowerCase() === titleTrimmed.toLowerCase());
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'A project with this title already exists.' });
      }
      project.title = titleTrimmed;
    }

    if (description !== undefined) project.description = description.trim();
    if (domain !== undefined) project.domain = resolveToCanonical('domain', domain)?.name || domain.trim();
    if (techStack !== undefined) {
      project.techStack = normalizeList('skill', Array.isArray(techStack) ? techStack : (typeof techStack === 'string' ? techStack.split(',') : []), { namesOnly: true });
    }
    if (status !== undefined) project.status = status;
    if (link !== undefined) {
      const trimmedLink = link.trim();
      const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;
      if (trimmedLink && !urlPattern.test(trimmedLink)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid project URL (e.g. https://github.com/...)' });
      }
      project.link = trimmedLink;
    }

    await user.save();
    updateUserEmbedding(user).catch(err => console.error('[UpdateProject Embedding]', err.message));

    return res.json({
      success: true,
      message: 'Project updated successfully',
      projects: user.projects,
      project
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a project from user profile
 * @route   DELETE /api/users/projects/:id
 * @access  Private
 */
const deleteProject = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.projects = user.projects.filter(p => p._id.toString() !== req.params.id);
    await user.save();
    updateUserEmbedding(user).catch(err => console.error('[DeleteProject Embedding]', err.message));

    return res.json({
      success: true,
      message: 'Project removed successfully',
      projects: user.projects
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add a research topic to user profile
 * @route   POST /api/users/research
 * @access  Private
 */
const addResearchTopic = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { title, domain, description, skills } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Research topic title is required.' });
    }

    const titleTrimmed = title.trim();
    if (user.researchTopics.some(t => t.title.toLowerCase() === titleTrimmed.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'A research topic with this title already exists.' });
    }

    const canonicalDomain = resolveToCanonical('domain', domain)?.name || (domain || '').trim();
    const cleanSkills = normalizeList('skill', Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',') : []), { namesOnly: true });

    const newTopic = {
      title: titleTrimmed,
      domain: canonicalDomain,
      description: (description || '').trim(),
      skills: cleanSkills
    };

    user.researchTopics.push(newTopic);
    user.researchInterests = user.researchTopics.map(t => t.title);

    await user.save();
    updateUserEmbedding(user).catch(err => console.error('[AddResearch Embedding]', err.message));

    return res.status(201).json({
      success: true,
      message: 'Research topic added successfully',
      researchTopics: user.researchTopics,
      researchTopic: user.researchTopics[user.researchTopics.length - 1]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a research topic on user profile
 * @route   PUT /api/users/research/:id
 * @access  Private
 */
const updateResearchTopic = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const topic = user.researchTopics.id(req.params.id);
    if (!topic) return res.status(404).json({ success: false, message: 'Research topic not found' });

    const { title, domain, description, skills } = req.body;
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: 'Research topic title cannot be empty.' });
      }
      const titleTrimmed = title.trim();
      const duplicate = user.researchTopics.some(t => t._id.toString() !== req.params.id && t.title.toLowerCase() === titleTrimmed.toLowerCase());
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'A research topic with this title already exists.' });
      }
      topic.title = titleTrimmed;
    }

    if (domain !== undefined) topic.domain = resolveToCanonical('domain', domain)?.name || domain.trim();
    if (description !== undefined) topic.description = description.trim();
    if (skills !== undefined) {
      topic.skills = normalizeList('skill', Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',') : []), { namesOnly: true });
    }

    user.researchInterests = user.researchTopics.map(t => t.title);

    await user.save();
    updateUserEmbedding(user).catch(err => console.error('[UpdateResearch Embedding]', err.message));

    return res.json({
      success: true,
      message: 'Research topic updated successfully',
      researchTopics: user.researchTopics,
      researchTopic: topic
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a research topic from user profile
 * @route   DELETE /api/users/research/:id
 * @access  Private
 */
const deleteResearchTopic = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.researchTopics = user.researchTopics.filter(t => t._id.toString() !== req.params.id);
    user.researchInterests = user.researchTopics.map(t => t.title);

    await user.save();
    updateUserEmbedding(user).catch(err => console.error('[DeleteResearch Embedding]', err.message));

    return res.json({
      success: true,
      message: 'Research topic removed successfully',
      researchTopics: user.researchTopics
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};

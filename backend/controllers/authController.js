const User = require('../models/User');
const { generateToken } = require('../utils/jwtUtils');
const { updateUserEmbedding } = require('../services/aiEmbeddingService');

/**
 * @desc    Register a new professional/researcher user account
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      organization,
      avatarId,
      profileImage,
      bio,
      skills,
      expertise,
      researchInterests,
      researchTopics,
      researchDomains,
      projects
    } = req.body;

    // Validate essential required account fields
    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (name, email, password)'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address'
      });
    }

    // Helper to format string arrays (comma-separated strings or arrays)
    const parseArrayField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field.map(s => String(s).trim()).filter(Boolean);
      if (typeof field === 'string') return field.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    };

    const finalRole = (role && role.trim()) ? role.trim() : 'Researcher';
    const finalOrg = (organization && organization.trim()) ? organization.trim() : 'Independent Researcher';
    const finalAvatarId = avatarId || 'avatar-1';
    const finalProfileImage = profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

    let finalResearchTopics = [];
    if (Array.isArray(researchTopics)) {
      finalResearchTopics = researchTopics
        .filter(t => t && t.title && t.title.trim())
        .map(t => ({
          title: t.title.trim(),
          domain: (t.domain || '').trim(),
          description: (t.description || '').trim(),
          skills: Array.isArray(t.skills) ? t.skills.map(s => String(s).trim()).filter(Boolean) : []
        }));
    }

    let finalInterests = parseArrayField(researchInterests);
    if (finalResearchTopics.length > 0 && finalInterests.length === 0) {
      finalInterests = finalResearchTopics.map(t => t.title);
    } else if (finalInterests.length > 0 && finalResearchTopics.length === 0) {
      finalResearchTopics = finalInterests.map(title => ({
        title,
        domain: '',
        description: '',
        skills: []
      }));
    }

    let finalProjects = [];
    if (Array.isArray(projects)) {
      finalProjects = projects
        .filter(p => p && p.title && p.title.trim())
        .map(p => ({
          title: p.title.trim(),
          description: (p.description || '').trim(),
          domain: (p.domain || '').trim(),
          techStack: Array.isArray(p.techStack) ? p.techStack.map(s => String(s).trim()).filter(Boolean) : [],
          status: p.status || 'In Progress',
          link: (p.link || '').trim()
        }));
    }

    // Create new user in database
    const user = await User.create({
      name: (name || '').trim(),
      email: normalizedEmail,
      password,
      avatarId: finalAvatarId,
      profileImage: finalProfileImage,
      role: finalRole,
      organization: finalOrg,
      bio: bio || 'Passionate about research, innovation, and professional networking.',
      skills: parseArrayField(skills),
      expertise: parseArrayField(expertise),
      researchInterests: finalInterests,
      researchTopics: finalResearchTopics,
      researchDomains: parseArrayField(researchDomains),
      projects: finalProjects,
      // Default placeholder location (0, 0) until updated via Geolocation API
      location: {
        type: 'Point',
        coordinates: [0, 0]
      }
    });

    if (user) {
      // Asynchronously generate AI semantic profile embedding for new user
      updateUserEmbedding(user).catch(err =>
        console.error('[Register] Embedding generation failed:', err.message)
      );

      // Generate JWT token
      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization,
          bio: user.bio,
          avatarId: user.avatarId,
          profileImage: user.profileImage,
          skills: user.skills,
          expertise: user.expertise,
          researchInterests: user.researchInterests,
          researchTopics: user.researchTopics,
          researchDomains: user.researchDomains,
          discoverable: user.discoverable,
          preferredRadius: user.preferredRadius,
          projects: user.projects,
          publications: user.publications
        }
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user data received' });
    }
  } catch (error) {
    console.error('[Auth Register Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Authenticate user & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

    // Find user by email including the password field (since it is set to select: false)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization,
          bio: user.bio,
          avatarId: user.avatarId,
          profileImage: user.profileImage,
          skills: user.skills,
          expertise: user.expertise,
          researchInterests: user.researchInterests,
          researchTopics: user.researchTopics,
          researchDomains: user.researchDomains,
          discoverable: user.discoverable,
          preferredRadius: user.preferredRadius,
          projects: user.projects,
          publications: user.publications
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({
      success: true,
      user
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};

const User = require('../models/User');
const { generateToken } = require('../utils/jwtUtils');

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
      bio,
      skills,
      expertise,
      researchInterests,
      researchDomains
    } = req.body;

    // Validate required input fields
    if (!name || !email || !password || !role || !organization) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (name, email, password, role, organization)'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address'
      });
    }

    // Helper to format string arrays (comma-separated strings or arrays)
    const parseArrayField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field.map(s => s.trim());
      if (typeof field === 'string') return field.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    };

    // Create new user in database
    const user = await User.create({
      name,
      email,
      password,
      role,
      organization,
      bio: bio || 'Passionate about research, innovation, and professional networking.',
      skills: parseArrayField(skills),
      expertise: parseArrayField(expertise),
      researchInterests: parseArrayField(researchInterests),
      researchDomains: parseArrayField(researchDomains),
      // Default placeholder location (0, 0) until updated via Geolocation API
      location: {
        type: 'Point',
        coordinates: [0, 0]
      }
    });

    if (user) {
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
          profileImage: user.profileImage,
          skills: user.skills,
          expertise: user.expertise,
          researchInterests: user.researchInterests,
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

    // Find user by email including the password field (since it is set to select: false)
    const user = await User.findOne({ email }).select('+password');

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
          profileImage: user.profileImage,
          skills: user.skills,
          expertise: user.expertise,
          researchInterests: user.researchInterests,
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

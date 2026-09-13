const User = require('../models/User');

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
      profileImage,
      role,
      organization,
      bio,
      skills,
      expertise,
      researchInterests,
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
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (role !== undefined) user.role = role;
    if (organization !== undefined) user.organization = organization;
    if (bio !== undefined) user.bio = bio;

    if (skills !== undefined) user.skills = parseArray(skills);
    if (expertise !== undefined) user.expertise = parseArray(expertise);
    if (researchInterests !== undefined) user.researchInterests = parseArray(researchInterests);
    if (researchDomains !== undefined) user.researchDomains = parseArray(researchDomains);

    if (projects !== undefined) user.projects = projects;
    if (publications !== undefined) user.publications = publications;
    if (collaboration !== undefined) user.collaboration = collaboration;

    if (discoverable !== undefined) user.discoverable = Boolean(discoverable);
    if (preferredRadius !== undefined) user.preferredRadius = Number(preferredRadius);

    const updatedUser = await user.save();

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

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserById
};

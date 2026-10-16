const User = require('../models/User');
const { updateUserEmbedding } = require('../services/aiEmbeddingService');

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

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserById,
  searchPublications
};

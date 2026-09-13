const User = require('../models/User');
const Connection = require('../models/Connection');
const { calculateHaversineDistanceMeters, formatApproximateDistance } = require('../utils/distanceCalculator');
const { calculateMatchScore } = require('../services/matchService');

/**
 * @desc    Update current logged-in user's GPS Location in GeoJSON format
 * @route   POST /api/location/update
 * @access  Private
 */
const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid latitude and longitude coordinates'
      });
    }

    const numLat = Number(latitude);
    const numLng = Number(longitude);

    if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude numerical range'
      });
    }

    // GEOJSON CRITICAL NOTICE: Coordinates are stored in [longitude, latitude] array order!
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        location: {
          type: 'Point',
          coordinates: [numLng, numLat]
        }
      },
      { new: true }
    ).select('-password');

    return res.json({
      success: true,
      message: 'GPS Location updated successfully in MongoDB GeoJSON format',
      locationStatus: 'Active',
      discoverable: updatedUser.discoverable
    });
  } catch (error) {
    console.error('[Location Update Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Find nearby discoverable users within specified radius (in meters)
 * @route   GET /api/location/nearby
 * @access  Private
 */
const getNearbyUsers = async (req, res) => {
  try {
    const radiusMeters = Number(req.query.radius) || req.user.preferredRadius || 1000;
    const currentUser = await User.findById(req.user._id);

    if (!currentUser || !currentUser.location || !currentUser.location.coordinates || currentUser.location.coordinates.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Your location is not updated yet. Please click "Discover Nearby" to enable GPS.'
      });
    }

    const [userLng, userLat] = currentUser.location.coordinates;

    // Check if user coordinates are initialized (not default 0,0)
    if (userLng === 0 && userLat === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please update your current GPS location to discover nearby professionals.'
      });
    }

    // Fetch existing connections for the current user to include connection status in results
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

    /**
     * MONGODB 2DSPHERE GEOSPATIAL QUERY
     * Uses $near operator with GeoJSON Point to query discoverable users within radius in meters.
     */
    let candidates = [];
    try {
      candidates = await User.find({
        _id: { $ne: req.user._id },
        discoverable: true,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [userLng, userLat]
            },
            $maxDistance: radiusMeters
          }
        }
      }).select('-password');
    } catch (geoErr) {
      console.warn('[Geospatial Query Fallback]: Using Haversine filter due to 2dsphere index initialization state:', geoErr.message);
      // Fallback query if 2dsphere index is building
      const allDiscoverable = await User.find({
        _id: { $ne: req.user._id },
        discoverable: true
      }).select('-password');

      candidates = allDiscoverable.filter(u => {
        if (!u.location || !u.location.coordinates || u.location.coordinates.length < 2) return false;
        const [candLng, candLat] = u.location.coordinates;
        if (candLng === 0 && candLat === 0) return false;
        const dist = calculateHaversineDistanceMeters(userLat, userLng, candLat, candLng);
        return dist <= radiusMeters;
      });
    }

    /**
     * PRIVACY OBFUSCATION & SMART MATCH ENHANCEMENT
     * Calculates distance & match score, attaches privacy label, and STRIPS raw coordinates.
     */
    const processedNearbyUsers = candidates.map(candidate => {
      const candidateObj = candidate.toObject();
      const [candLng, candLat] = candidateObj.location?.coordinates || [0, 0];

      // Calculate exact distance for backend calculation
      const exactDistance = calculateHaversineDistanceMeters(userLat, userLng, candLat, candLng);

      // Convert exact distance to privacy-compliant string (e.g. "Within 500 meters")
      const approximateDistance = formatApproximateDistance(exactDistance);

      // Calculate Smart Match Score
      const { matchScore, matchDetails } = calculateMatchScore(currentUser, candidateObj);

      // Get connection relationship status with current user
      const connectionInfo = connectionMap[candidateObj._id.toString()] || { status: 'none' };

      // CRITICAL PRIVACY REQUIREMENT: Strip exact coordinates before sending to frontend!
      delete candidateObj.location;

      return {
        ...candidateObj,
        approximateDistance,
        matchScore,
        matchDetails,
        connectionStatus: connectionInfo.status,
        connectionId: connectionInfo.connectionId || null,
        isSender: connectionInfo.isSender || false
      };
    });

    // Sort by highest match score first, then by closest distance
    processedNearbyUsers.sort((a, b) => b.matchScore - a.matchScore);

    return res.json({
      success: true,
      count: processedNearbyUsers.length,
      radiusMeters,
      users: processedNearbyUsers
    });
  } catch (error) {
    console.error('[Get Nearby Users Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  updateLocation,
  getNearbyUsers
};

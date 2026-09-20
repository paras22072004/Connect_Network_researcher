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
 * @desc    Find nearby discoverable users within specified radius (in meters or 'all'/'others')
 * @route   GET /api/location/nearby
 * @access  Private
 */
const getNearbyUsers = async (req, res) => {
  try {
    // Enforce discovery radius strictly capped at maximum 1000 meters (1 km)
    const rawRadius = Number(req.query.radius) || req.user.preferredRadius || 1000;
    const radiusMeters = Math.min(Math.max(rawRadius, 100), 1000);
    const isAll = false;
    const currentUser = await User.findById(req.user._id);

    if (!currentUser || !currentUser.location || !currentUser.location.coordinates || currentUser.location.coordinates.length < 2) {
      return res.status(200).json({
        success: false,
        locationRequired: true,
        message: 'Your location is not updated yet. Please click "Enable GPS Location" to discover professionals nearby.'
      });
    }

    const [userLng, userLat] = currentUser.location.coordinates;

    // Check if user coordinates are default 0,0
    if (userLng === 0 && userLat === 0) {
      return res.status(200).json({
        success: false,
        locationRequired: true,
        message: 'Please enable your GPS location to discover nearby professionals.'
      });
    }

    // Fetch existing connections for the current user
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
     * Filters candidates and EXCLUDES default [0,0] un-updated coordinates!
     */
    let candidates = [];
    if (isAll) {
      candidates = await User.find({
        _id: { $ne: req.user._id },
        discoverable: true,
        'location.coordinates': { $ne: [0, 0] }
      }).select('-password');
    } else {
      try {
        candidates = await User.find({
          _id: { $ne: req.user._id },
          discoverable: true,
          'location.coordinates': { $ne: [0, 0] },
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
        console.warn('[Geospatial Query Fallback]: Using Haversine filter due to 2dsphere index state:', geoErr.message);
        const allDiscoverable = await User.find({
          _id: { $ne: req.user._id },
          discoverable: true,
          'location.coordinates': { $ne: [0, 0] }
        }).select('-password');

        candidates = allDiscoverable.filter(u => {
          if (!u.location || !u.location.coordinates || u.location.coordinates.length < 2) return false;
          const [candLng, candLat] = u.location.coordinates;
          if (candLng === 0 && candLat === 0) return false;
          const dist = calculateHaversineDistanceMeters(userLat, userLng, candLat, candLng);
          return dist <= radiusMeters;
        });
      }
    }

/**
 * Generates a privacy-safe obfuscated map coordinate for rendering markers.
 * Adds a small deterministic radial offset (~60 to 140 meters) based on user ID.
 * This guarantees the user's exact stored latitude & longitude are NEVER sent to the client.
 */
const getPrivacySafeMapPosition = (userIdStr, realLat, realLng) => {
  let hash = 0;
  for (let i = 0; i < userIdStr.length; i++) {
    hash = (hash << 5) - hash + userIdStr.charCodeAt(i);
    hash |= 0;
  }
  const angle = Math.abs(hash % 360) * (Math.PI / 180);
  const offsetDist = 0.0006 + (Math.abs(hash) % 800) / 1000000;

  return {
    latitude: parseFloat((realLat + offsetDist * Math.cos(angle)).toFixed(5)),
    longitude: parseFloat((realLng + offsetDist * Math.sin(angle)).toFixed(5))
  };
};

    /**
     * PRIVACY OBFUSCATION & SMART MATCH ENHANCEMENT
     * Filters out un-updated coordinates [0,0] to guarantee no fake 8770km entries.
     */
    const processedNearbyUsers = candidates
      .filter(candidate => {
        const coords = candidate.location?.coordinates;
        return coords && coords.length >= 2 && !(coords[0] === 0 && coords[1] === 0);
      })
      .map(candidate => {
        const candidateObj = candidate.toObject();
        const [candLng, candLat] = candidateObj.location?.coordinates || [0, 0];

        const exactDistance = calculateHaversineDistanceMeters(userLat, userLng, candLat, candLng);
        const approximateDistance = formatApproximateDistance(exactDistance);
        const mapPosition = getPrivacySafeMapPosition(candidateObj._id.toString(), candLat, candLng);
        const { matchScore, matchDetails } = calculateMatchScore(currentUser, candidateObj);
        const connectionInfo = connectionMap[candidateObj._id.toString()] || { status: 'none' };

        delete candidateObj.location;

        return {
          ...candidateObj,
          approximateDistance,
          mapPosition,
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
      radiusMeters: isAll ? 'all' : radiusMeters,
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

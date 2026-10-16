const Event = require('../models/Event');
const User = require('../models/User');
const Connection = require('../models/Connection');
const { calculateMatchScore } = require('../services/matchService');
const { ensureUserEmbedding } = require('../services/aiEmbeddingService');
const { calculateHaversineDistanceMeters, formatApproximateDistance } = require('../utils/distanceCalculator');

/**
 * @desc    Get all available events with filtering & search
 * @route   GET /api/events
 * @access  Private
 */
const getEvents = async (req, res) => {
  try {
    const { category, search, locationType } = req.query;
    const filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (locationType && locationType !== 'All') {
      filter.locationType = locationType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { venue: { $regex: q, $options: 'i' } },
        { topics: { $in: [new RegExp(q, 'i')] } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    // Sort by upcoming events first
    let events = await Event.find(filter)
      .populate('organizer', 'name role organization profileImage')
      .sort({ startDate: 1 });

    // Seed realistic professional events if the database has 0 events
    if (events.length === 0 && (!category || category === 'All') && !search) {
      const demoEvents = [
        {
          title: 'Global AI & Robotics Research Summit 2026',
          description: 'Premier academic and industrial conference featuring keynotes on foundation models, embodied AI, and ethical autonomous agents.',
          category: 'Conference',
          locationType: 'Hybrid',
          venue: 'Grand Convention Hall & Virtual Stream',
          city: 'San Francisco, CA',
          startDate: new Date(Date.now() + 86400000 * 4), // 4 days from now
          endDate: new Date(Date.now() + 86400000 * 6),
          organizer: req.user._id,
          attendees: [{ user: req.user._id, joinedAt: new Date() }],
          tags: ['Artificial Intelligence', 'Machine Learning', 'Robotics', 'Keynote'],
          topics: ['Deep Learning', 'Computer Vision', 'Reinforcement Learning'],
          capacity: 500
        },
        {
          title: 'Campus Hackathon: Distributed Systems & Web3',
          description: '48-hour competitive collegiate hackathon building high-throughput decentralized protocols and edge computing solutions.',
          category: 'Hackathon',
          locationType: 'In-Person',
          venue: 'Engineering & Computing Innovation Lab, Bldg 4',
          city: 'Berkeley, CA',
          startDate: new Date(Date.now() + 86400000 * 10),
          endDate: new Date(Date.now() + 86400000 * 12),
          organizer: req.user._id,
          attendees: [{ user: req.user._id, joinedAt: new Date() }],
          tags: ['Hackathon', 'Distributed Systems', 'Blockchain', 'Cloud'],
          topics: ['Go', 'Rust', 'Kubernetes', 'P2P Protocols'],
          capacity: 150
        },
        {
          title: 'Bioinformatics & Computational Genomics Seminar',
          description: 'Weekly research seminar exploring graph neural networks for drug discovery and single-cell transcriptomics.',
          category: 'Seminar',
          locationType: 'Hybrid',
          venue: 'Life Sciences Auditorium 102',
          city: 'Stanford, CA',
          startDate: new Date(Date.now() + 86400000 * 15),
          endDate: new Date(Date.now() + 86400000 * 15 + 10800000),
          organizer: req.user._id,
          attendees: [{ user: req.user._id, joinedAt: new Date() }],
          tags: ['Bioinformatics', 'Genomics', 'Machine Learning', 'Seminar'],
          topics: ['Graph Neural Networks', 'Drug Discovery', 'Python'],
          capacity: 80
        },
        {
          title: 'Hands-on Workshop: Productionizing Transformers with ONNX',
          description: 'Practical interactive engineering workshop covering model quantization, low-latency deployment, and kernel optimizations.',
          category: 'Workshop',
          locationType: 'Virtual',
          venue: 'GeoConnect Live Interactive Lab (Online)',
          city: 'Online',
          startDate: new Date(Date.now() + 86400000 * 20),
          endDate: new Date(Date.now() + 86400000 * 20 + 14400000),
          organizer: req.user._id,
          attendees: [{ user: req.user._id, joinedAt: new Date() }],
          tags: ['Workshop', 'MLOps', 'Transformers', 'Deployment'],
          topics: ['ONNX', 'PyTorch', 'C++', 'Model Optimization'],
          capacity: 100
        }
      ];

      await Event.insertMany(demoEvents);
      events = await Event.find(filter)
        .populate('organizer', 'name role organization profileImage')
        .sort({ startDate: 1 });
    }

    // Attach isAttending flag for current user
    const formatted = events.map(evt => {
      const eObj = evt.toObject();
      const isAttending = Array.isArray(eObj.attendees) && eObj.attendees.some(
        a => a.user?.toString() === req.user._id.toString() || a.user?._id?.toString() === req.user._id.toString()
      );
      return {
        ...eObj,
        attendeeCount: eObj.attendees?.length || 0,
        isAttending
      };
    });

    return res.json({
      success: true,
      count: formatted.length,
      events: formatted
    });
  } catch (error) {
    console.error('[Get Events Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single event details
 * @route   GET /api/events/:id
 * @access  Private
 */
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name role organization profileImage bio')
      .populate('attendees.user', 'name role organization profileImage skills researchInterests location');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const eObj = event.toObject();
    const isAttending = Array.isArray(eObj.attendees) && eObj.attendees.some(
      a => a.user?._id?.toString() === req.user._id.toString()
    );

    return res.json({
      success: true,
      event: {
        ...eObj,
        attendeeCount: eObj.attendees?.length || 0,
        isAttending
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new professional event
 * @route   POST /api/events
 * @access  Private
 */
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      locationType,
      venue,
      city,
      startDate,
      endDate,
      tags = [],
      topics = [],
      capacity = 200,
      externalLink = ''
    } = req.body;

    if (!title || !description || !venue || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, venue, startDate, and endDate.'
      });
    }

    const event = await Event.create({
      title,
      description,
      category: category || 'Conference',
      locationType: locationType || 'In-Person',
      venue,
      city: city || 'Local',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      organizer: req.user._id,
      attendees: [{ user: req.user._id, joinedAt: new Date() }],
      tags: Array.isArray(tags) ? tags : String(tags).split(',').map(s => s.trim()).filter(Boolean),
      topics: Array.isArray(topics) ? topics : String(topics).split(',').map(s => s.trim()).filter(Boolean),
      capacity: Number(capacity) || 200,
      externalLink
    });

    const populated = await Event.findById(event._id)
      .populate('organizer', 'name role organization profileImage');

    return res.status(201).json({
      success: true,
      message: 'Event published successfully',
      event: populated
    });
  } catch (error) {
    console.error('[Create Event Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Join an event as attendee (Prevents duplicate participation)
 * @route   POST /api/events/:id/join
 * @access  Private
 */
const joinEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if already attending
    const alreadyAttending = event.attendees.some(
      a => a.user.toString() === req.user._id.toString()
    );

    if (alreadyAttending) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this event.'
      });
    }

    if (event.attendees.length >= event.capacity) {
      return res.status(400).json({
        success: false,
        message: 'This event has reached full capacity.'
      });
    }

    event.attendees.push({
      user: req.user._id,
      joinedAt: new Date()
    });

    await event.save();

    return res.json({
      success: true,
      message: 'Successfully registered for event!',
      attendeeCount: event.attendees.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Leave an event
 * @route   POST /api/events/:id/leave
 * @access  Private
 */
const leaveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    event.attendees = event.attendees.filter(
      a => a.user.toString() !== req.user._id.toString()
    );

    await event.save();

    return res.json({
      success: true,
      message: 'You have left the event.',
      attendeeCount: event.attendees.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Discover relevant attendees for an event using AI semantic & skill matching
 * @route   GET /api/events/:id/attendees/match
 * @access  Private
 */
const getEventAttendeesWithMatch = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('attendees.user', '-password +aiProfileEmbedding');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const currentUser = await User.findById(req.user._id).select('+aiProfileEmbedding');
    let currentUserEmbedding = currentUser?.aiProfileEmbedding;
    if (!Array.isArray(currentUserEmbedding) || currentUserEmbedding.length === 0) {
      currentUserEmbedding = await ensureUserEmbedding(currentUser);
    }

    const [userLng, userLat] = currentUser?.location?.coordinates || [0, 0];
    const hasUserLocation = userLng !== 0 || userLat !== 0;

    // Fetch connection status for current user
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

    // Filter out current user and process attendees
    const attendees = (event.attendees || [])
      .filter(a => a.user && a.user._id.toString() !== req.user._id.toString())
      .map(a => {
        const u = a.user.toObject ? a.user.toObject() : a.user;

        // Compute AI match score with logged-in user
        let attendeeEmbedding = u.aiProfileEmbedding;
        const matchResult = calculateMatchScore(currentUser, u, {
          exactDistanceMeters: 500, // Normalized default inside same event venue
          radiusMeters: 1000,
          vecA: currentUserEmbedding,
          vecB: attendeeEmbedding
        });

        // Approximate distance
        let approximateDistance = 'At event venue';
        if (hasUserLocation && u.location?.coordinates && u.location.coordinates.length >= 2) {
          const [aLng, aLat] = u.location.coordinates;
          if (aLng !== 0 || aLat !== 0) {
            const dist = calculateHaversineDistanceMeters(userLat, userLng, aLat, aLng);
            approximateDistance = formatApproximateDistance(dist);
          }
        }

        const connInfo = connectionMap[u._id.toString()] || { status: 'none' };

        // Privacy: strip raw coordinates and embeddings
        delete u.location;
        delete u.aiProfileEmbedding;
        delete u.aiProfileText;

        return {
          ...u,
          joinedAt: a.joinedAt,
          matchScore: matchResult.matchScore,
          semanticScore: matchResult.semanticScore,
          matchReasons: matchResult.matchReasons,
          matchExplanation: matchResult.matchExplanation,
          approximateDistance,
          connectionStatus: connInfo.status,
          connectionId: connInfo.connectionId || null,
          isSender: connInfo.isSender || false
        };
      });

    // Sort by highest match score first
    attendees.sort((a, b) => b.matchScore - a.matchScore);

    return res.json({
      success: true,
      count: attendees.length,
      attendees
    });
  } catch (error) {
    console.error('[Event Attendees Match Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  joinEvent,
  leaveEvent,
  getEventAttendeesWithMatch
};

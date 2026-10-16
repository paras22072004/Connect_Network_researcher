const Message = require('../models/Message');
const Connection = require('../models/Connection');
const User = require('../models/User');

/**
 * Helper to check if two users have an active 'accepted' connection.
 */
const areUsersConnected = async (user1Id, user2Id) => {
  const connection = await Connection.findOne({
    $or: [
      { sender: user1Id, receiver: user2Id },
      { sender: user2Id, receiver: user1Id }
    ],
    status: 'accepted'
  });
  return !!connection;
};

/**
 * @desc    Get message history between logged in user and target user
 * @route   GET /api/messages/:userId
 * @access  Private
 */
const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    // Verify user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Recipient user not found' });
    }

    // CHECK CONNECTION PRIVACY: Messaging requires accepted connection status
    const isConnected = await areUsersConnected(currentUserId, targetUserId);
    if (!isConnected) {
      return res.status(403).json({
        success: false,
        message: 'You must be connected with this professional to view or send messages.'
      });
    }

    // Fetch conversation messages sorted chronologically
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    // Mark unread incoming messages as read
    await Message.updateMany(
      { sender: targetUserId, receiver: currentUserId, read: false },
      { $set: { read: true, status: 'read' } }
    );

    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('[Get Messages Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Upload media file (image, video, audio, document) for messaging
 * @route   POST /api/messages/upload
 * @access  Private
 */
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const path = require('path');
    const mime = req.file.mimetype ? req.file.mimetype.toLowerCase() : '';
    const ext = path.extname(req.file.originalname).toLowerCase();
    let messageType = 'file';
    if (mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
      messageType = 'image';
    } else if (mime.startsWith('video/') || ['.mp4', '.mov', '.webm', '.avi', '.mkv'].includes(ext)) {
      messageType = 'video';
    } else if (mime.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].includes(ext)) {
      messageType = 'audio';
    } else {
      messageType = 'file';
    }

    const mediaUrl = `/uploads/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      mediaUrl,
      mediaName: req.file.originalname,
      mediaSize: req.file.size,
      mediaMimeType: req.file.mimetype,
      messageType
    });
  } catch (error) {
    console.error('[Upload Media Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Send a message (text or media) to a connected user (REST Endpoint)
 * @route   POST /api/messages/:userId
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;
    const {
      content,
      messageType,
      mediaUrl,
      mediaName,
      mediaSize,
      mediaMimeType
    } = req.body;

    const hasText = content && content.trim().length > 0;
    const hasMedia = !!mediaUrl;

    if (!hasText && !hasMedia) {
      return res.status(400).json({
        success: false,
        message: 'Message must contain text content or media.'
      });
    }

    // Verify connection status
    const isConnected = await areUsersConnected(senderId, receiverId);
    if (!isConnected) {
      return res.status(403).json({
        success: false,
        message: 'You can only message accepted connections.'
      });
    }

    const determinedType = messageType || (hasMedia ? 'image' : 'text');

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content: hasText ? content.trim() : '',
      messageType: determinedType,
      mediaUrl: mediaUrl || null,
      mediaName: mediaName || null,
      mediaSize: mediaSize || null,
      mediaMimeType: mediaMimeType || null
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('[Send Message Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  uploadMedia,
  areUsersConnected
};

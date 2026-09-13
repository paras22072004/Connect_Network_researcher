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
      { $set: { read: true } }
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
 * @desc    Send a message to a connected user (REST Endpoint)
 * @route   POST /api/messages/:userId
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    // Verify connection status
    const isConnected = await areUsersConnected(senderId, receiverId);
    if (!isConnected) {
      return res.status(403).json({
        success: false,
        message: 'You can only message accepted connections.'
      });
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content: content.trim()
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
  areUsersConnected
};

const Connection = require('../models/Connection');
const User = require('../models/User');

/**
 * @desc    Send a connection request to another user
 * @route   POST /api/connections/request/:userId
 * @access  Private
 */
const sendConnectionRequest = async (req, res) => {
  try {
    const receiverId = req.params.userId;
    const senderId = req.user._id;

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot send a connection request to yourself' });
    }

    // Check if target user exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'User to connect with does not exist' });
    }

    // Check if a connection or request already exists between these users
    const existingConnection = await Connection.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existingConnection) {
      return res.status(400).json({
        success: false,
        message: `Connection status is already '${existingConnection.status}'`,
        connection: existingConnection
      });
    }

    // Create new connection request with status 'pending'
    const newConnection = await Connection.create({
      sender: senderId,
      receiver: receiverId,
      status: 'pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      connection: newConnection
    });
  } catch (error) {
    console.error('[Send Connection Request Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Accept a pending connection request
 * @route   PUT /api/connections/accept/:connectionId
 * @access  Private
 */
const acceptConnectionRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection request not found' });
    }

    // Only the designated receiver of the connection request can accept it
    if (connection.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to accept this connection request' });
    }

    connection.status = 'accepted';
    await connection.save();

    return res.json({
      success: true,
      message: 'Connection request accepted',
      connection
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Reject a pending connection request
 * @route   PUT /api/connections/reject/:connectionId
 * @access  Private
 */
const rejectConnectionRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection request not found' });
    }

    if (connection.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this connection request' });
    }

    connection.status = 'rejected';
    await connection.save();

    return res.json({
      success: true,
      message: 'Connection request rejected',
      connection
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Cancel a sent connection request or remove connection
 * @route   DELETE /api/connections/cancel/:connectionId
 * @access  Private
 */
const cancelConnectionRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found' });
    }

    // Sender or receiver can remove the connection
    if (connection.sender.toString() !== req.user._id.toString() && connection.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to remove this connection' });
    }

    await Connection.findByIdAndDelete(connectionId);

    return res.json({
      success: true,
      message: 'Connection request cancelled or removed successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all accepted connections for logged-in user
 * @route   GET /api/connections
 * @access  Private
 */
const getAcceptedConnections = async (req, res) => {
  try {
    const userId = req.user._id;

    const connections = await Connection.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: 'accepted'
    })
    .populate('sender', 'name email role organization profileImage skills researchInterests bio')
    .populate('receiver', 'name email role organization profileImage skills researchInterests bio');

    // Extract the other connected user profile for client convenience
    const connectedUsers = connections.map(conn => {
      const isSender = conn.sender._id.toString() === userId.toString();
      const connectedUser = isSender ? conn.receiver : conn.sender;
      return {
        connectionId: conn._id,
        user: connectedUser,
        connectedSince: conn.updatedAt
      };
    });

    return res.json({
      success: true,
      count: connectedUsers.length,
      connections: connectedUsers
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get pending incoming and outgoing connection requests
 * @route   GET /api/connections/requests
 * @access  Private
 */
const getConnectionRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    // Incoming requests (where current user is receiver)
    const incoming = await Connection.find({ receiver: userId, status: 'pending' })
      .populate('sender', 'name email role organization profileImage skills researchInterests bio');

    // Outgoing requests (where current user is sender)
    const outgoing = await Connection.find({ sender: userId, status: 'pending' })
      .populate('receiver', 'name email role organization profileImage skills researchInterests bio');

    return res.json({
      success: true,
      incoming: incoming.map(r => ({ connectionId: r._id, user: r.sender, createdAt: r.createdAt })),
      outgoing: outgoing.map(r => ({ connectionId: r._id, user: r.receiver, createdAt: r.createdAt }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  getAcceptedConnections,
  getConnectionRequests
};

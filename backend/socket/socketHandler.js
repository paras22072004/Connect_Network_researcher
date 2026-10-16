const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const { areUsersConnected } = require('../controllers/messageController');

/**
 * Socket.io Real-Time Messaging and Online Status Handler
 * 
 * Manages real-time 1-to-1 chat events, typing indicators, and user online/offline status.
 */
const initSocketHandler = (io) => {
  // Store connected user socket mappings: userId -> socketId
  const onlineUsers = new Map();

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_location_networking_jwt_key_2026');
      socket.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[Socket.io] User connected: ${userId} (Socket ID: ${socket.id})`);

    // Register online user & join private room matching their User ID
    onlineUsers.set(userId, socket.id);
    socket.join(userId);

    // Broadcast updated list of online user IDs to all clients
    io.emit('get_online_users', Array.from(onlineUsers.keys()));

    // Mark pending messages sent to this user as 'delivered'
    Message.updateMany(
      { receiver: userId, status: 'sent', read: false },
      { $set: { status: 'delivered' } }
    ).then(async () => {
      const distinctSenders = await Message.distinct('sender', { receiver: userId, status: 'delivered', read: false });
      distinctSenders.forEach((sId) => {
        io.to(sId.toString()).emit('messages_delivered', { recipientId: userId });
      });
    }).catch((err) => console.error('[Socket update delivered error]:', err));

    /**
     * Private Message Event
     * Validates connection status before emitting message to receiver room.
     */
    socket.on('send_message', async (data) => {
      try {
        const {
          receiverId,
          content,
          messageType,
          mediaUrl,
          mediaName,
          mediaSize,
          mediaMimeType
        } = data;

        const hasText = content && content.trim().length > 0;
        const hasMedia = !!mediaUrl;

        if (!receiverId || (!hasText && !hasMedia)) return;

        // Verify active connection between users
        const isConnected = await areUsersConnected(userId, receiverId);
        if (!isConnected) {
          socket.emit('error_message', { message: 'Cannot message user without an accepted connection.' });
          return;
        }

        const isReceiverOnline = onlineUsers.has(receiverId);
        const initialStatus = isReceiverOnline ? 'delivered' : 'sent';

        // Save message to MongoDB
        const newMessage = await Message.create({
          sender: userId,
          receiver: receiverId,
          content: hasText ? content.trim() : '',
          messageType: determinedType,
          mediaUrl: mediaUrl || null,
          mediaName: mediaName || null,
          mediaSize: mediaSize || null,
          mediaMimeType: mediaMimeType || null,
          status: initialStatus,
          read: false
        });

        const payload = {
          _id: newMessage._id,
          sender: userId,
          receiver: receiverId,
          content: newMessage.content,
          messageType: newMessage.messageType,
          mediaUrl: newMessage.mediaUrl,
          mediaName: newMessage.mediaName,
          mediaSize: newMessage.mediaSize,
          mediaMimeType: newMessage.mediaMimeType,
          status: initialStatus,
          read: false,
          createdAt: newMessage.createdAt
        };

        // Emit message to receiver's room & sender's room for instant UI sync
        io.to(receiverId).emit('receive_message', payload);
        io.to(userId).emit('message_sent', payload);
      } catch (err) {
        console.error('[Socket Send Message Error]:', err);
        socket.emit('error_message', { message: 'Failed to deliver message' });
      }
    });

    /**
     * Mark Messages as Read Event
     */
    socket.on('mark_as_read', async ({ senderId }) => {
      try {
        if (!senderId) return;
        await Message.updateMany(
          { sender: senderId, receiver: userId, read: false },
          { $set: { read: true, status: 'read' } }
        );
        // Notify original sender in real time that messages were read
        io.to(senderId).emit('messages_read', { readerId: userId });
      } catch (err) {
        console.error('[Socket Mark As Read Error]:', err);
      }
    });

    /**
     * Typing Status Indicators
     */
    socket.on('typing', ({ receiverId }) => {
      io.to(receiverId).emit('user_typing', { senderId: userId });
    });

    socket.on('stop_typing', ({ receiverId }) => {
      io.to(receiverId).emit('user_stop_typing', { senderId: userId });
    });

    /**
     * Workspace Group Chat Events
     */
    socket.on('join_workspace_room', (workspaceId) => {
      if (!workspaceId) return;
      const room = `workspace_${workspaceId}`;
      socket.join(room);
      console.log(`[Socket.io] User ${userId} joined workspace room: ${room}`);
    });

    socket.on('leave_workspace_room', (workspaceId) => {
      if (!workspaceId) return;
      const room = `workspace_${workspaceId}`;
      socket.leave(room);
      console.log(`[Socket.io] User ${userId} left workspace room: ${room}`);
    });

    socket.on('send_workspace_message', async (data) => {
      try {
        const { workspaceId, content } = data || {};
        if (!workspaceId || !content || !content.trim()) return;

        const Workspace = require('../models/Workspace');
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
          socket.emit('workspace_error', { message: 'Workspace not found' });
          return;
        }

        const uId = userId.toString();
        const isOwner = workspace.owner && (workspace.owner.toString() === uId || workspace.owner._id?.toString() === uId);
        const isMember = Array.isArray(workspace.members) && workspace.members.some(
          m => m.user && (m.user.toString() === uId || m.user._id?.toString() === uId)
        );

        if (!isOwner && !isMember) {
          socket.emit('workspace_error', { message: 'Access denied: You must be a workspace member to post.' });
          return;
        }

        workspace.discussions.push({
          sender: userId,
          content: content.trim(),
          createdAt: new Date()
        });

        await workspace.save();

        const populated = await Workspace.findById(workspace._id)
          .populate('discussions.sender', 'name role profileImage');

        const createdMsg = populated.discussions[populated.discussions.length - 1];
        const room = `workspace_${workspaceId}`;

        // Broadcast to all sockets in the workspace room
        io.to(room).emit('receive_workspace_message', createdMsg);
      } catch (err) {
        console.error('[Socket send_workspace_message error]:', err);
        socket.emit('workspace_error', { message: err.message || 'Failed to send message' });
      }
    });

    /**
     * Disconnect Event
     */
    socket.on('disconnect', () => {
      console.log(`[Socket.io] User disconnected: ${userId}`);
      onlineUsers.delete(userId);
      io.emit('get_online_users', Array.from(onlineUsers.keys()));
    });
  });
};

module.exports = initSocketHandler;

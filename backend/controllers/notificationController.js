const Notification = require('../models/Notification');

/**
 * @desc    Get user's notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name role organization profileImage')
      .populate('project', 'title researchDomain')
      .populate('workspace', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });

    return res.json({
      success: true,
      unreadCount,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};

const Notification = require('../models/Notification');

/**
 * Creates and persists a notification, safely notifying recipient.
 */
const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  message,
  project = null,
  workspace = null,
  requestId = null
}) => {
  try {
    if (!recipient) return null;

    const notif = await Notification.create({
      recipient,
      sender: sender || null,
      type,
      title,
      message,
      project: project || null,
      workspace: workspace || null,
      requestId: requestId || null
    });

    return notif;
  } catch (error) {
    console.error('[NotificationService Error]:', error.message);
    return null;
  }
};

module.exports = {
  createNotification
};

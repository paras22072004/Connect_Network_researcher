const mongoose = require('mongoose');

/**
 * Notification Schema for GeoConnect
 * Stores persistent notifications for team join requests, workspace requests, invites, and membership changes.
 */
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'team_join_request',
      'team_request_accepted',
      'team_request_rejected',
      'team_invite',
      'team_invite_accepted',
      'team_invite_declined',
      'workspace_join_request',
      'workspace_request_accepted',
      'workspace_request_rejected',
      'member_removed'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectRequirement'
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;

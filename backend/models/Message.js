const mongoose = require('mongoose');

/**
 * Message Schema
 * Stores 1-to-1 messages (text, image, video, audio) exchanged between connected professionals.
 */
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file'],
    default: 'text'
  },
  mediaUrl: {
    type: String,
    default: null
  },
  mediaName: {
    type: String,
    default: null
  },
  mediaSize: {
    type: Number,
    default: null
  },
  mediaMimeType: {
    type: String,
    default: null
  },
  read: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  }
}, {
  timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;

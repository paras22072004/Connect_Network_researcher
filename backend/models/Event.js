const mongoose = require('mongoose');

/**
 * Event Schema for Professional & Academic Conferences, Hackathons & Seminars
 */
const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['Conference', 'Hackathon', 'Seminar', 'Workshop', 'Symposium', 'Meetup'],
    default: 'Conference'
  },
  locationType: {
    type: String,
    enum: ['In-Person', 'Virtual', 'Hybrid'],
    default: 'In-Person'
  },
  venue: {
    type: String,
    required: [true, 'Venue or Virtual link description is required'],
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  topics: [{
    type: String,
    trim: true
  }],
  capacity: {
    type: Number,
    default: 200
  },
  externalLink: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

eventSchema.index({ startDate: 1, category: 1 });
eventSchema.index({ 'attendees.user': 1 });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;

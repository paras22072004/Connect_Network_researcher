const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Publication Sub-schema for showcasing user's research papers.
 */
const publicationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  abstract: { type: String, trim: true },
  keywords: [{ type: String, trim: true }],
  domain: { type: String, trim: true },
  publicationVenue: { type: String, trim: true }, // e.g., IEEE, Nature, NeurIPS
  doiLink: { type: String, trim: true },
  githubLink: { type: String, trim: true },
  publicationLink: { type: String, trim: true }
}, { timestamps: true });

/**
 * Project Sub-schema for showcasing professional/academic projects.
 */
const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  techStack: [{ type: String, trim: true }],
  link: { type: String, trim: true }
}, { timestamps: true });

/**
 * Main User Schema
 * Contains user profile data, research portfolio, settings, and GeoJSON location data.
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Exclude password hash by default from queries for security
  },
  profileImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
  },
  role: {
    type: String,
    required: [true, 'Professional role is required'],
    trim: true
  },
  organization: {
    type: String,
    required: [true, 'University or Organization is required'],
    trim: true
  },
  bio: {
    type: String,
    default: 'Passionate about research, innovation, and professional networking.',
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  expertise: [{
    type: String,
    trim: true
  }],
  researchInterests: [{
    type: String,
    trim: true
  }],
  researchDomains: [{
    type: String,
    trim: true
  }],
  projects: [projectSchema],
  publications: [publicationSchema],
  collaboration: {
    lookingForCollaboration: { type: Boolean, default: true },
    collaborationAreas: [{ type: String, trim: true }]
  },
  
  /**
   * GeoJSON Point Location Field
   * CRITICAL NOTE: GeoJSON requires coordinates in [longitude, latitude] order!
   * Latitude is Y-axis (-90 to +90), Longitude is X-axis (-180 to +180).
   */
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  
  /**
   * User Privacy & Discovery Settings
   */
  discoverable: {
    type: Boolean,
    default: true,
    description: 'When false, user will not appear in nearby location searches.'
  },
  preferredRadius: {
    type: Number,
    default: 1000, // Preferred discovery radius in meters (100m, 500m, 1000m, 5000m)
  }
}, {
  timestamps: true
});

/**
 * 2dsphere Geospatial Indexing
 * Enables MongoDB to execute efficient $near and $geoWithin queries on coordinates.
 */
userSchema.index({ location: '2dsphere' });

/**
 * Password Hashing Pre-Save Hook
 * Automatically hashes updated passwords before saving to MongoDB.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Helper method to compare entered password with stored hashed password.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;

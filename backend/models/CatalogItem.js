const mongoose = require('mongoose');

/**
 * CatalogItem Schema
 * Standardized database catalog for Technical Skills, Research Interests, and Professional Domains.
 */
const catalogItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: ['skill', 'interest', 'domain'],
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    aliases: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ],
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isCustom: {
      type: Boolean,
      default: false,
      index: true
    },
    isApproved: {
      type: Boolean,
      default: true,
      index: true
    },
    suggestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
      index: true
    }
  },
  { timestamps: true }
);

// Compound text index to facilitate searching across canonical name, aliases, and category
catalogItemSchema.index({ name: 'text', aliases: 'text', category: 'text' });

module.exports = mongoose.model('CatalogItem', catalogItemSchema);

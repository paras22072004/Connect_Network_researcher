const mongoose = require('mongoose');

/**
 * CustomSuggestion Schema
 * Records user suggestions for new skills, research interests, and domains.
 * Allows controlled review, normalization, and approval into the canonical catalog.
 */
const customSuggestionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['skill', 'interest', 'domain'],
      index: true
    },
    suggestedName: {
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
      default: 'Community Suggestions'
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    suggestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'merged'],
      default: 'pending',
      index: true
    },
    canonicalMatchId: {
      type: String,
      trim: true,
      default: null
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomSuggestion', customSuggestionSchema);

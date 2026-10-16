const mongoose = require('mongoose');

/**
 * ProjectRequirement Schema for Research Team Builder
 * Allows researchers to post project specifications and recruit compatible collaborators.
 */
const projectRequirementSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true
  },
  requiredSkills: [{
    type: String,
    trim: true
  }],
  researchDomain: {
    type: String,
    trim: true
  },
  desiredRoles: [{
    type: String,
    trim: true
  }],
  collaborationType: {
    type: String,
    enum: ['Research Paper', 'Hackathon Project', 'Open-Source Tool', 'Startup / Prototype', 'Academic Thesis', 'Other'],
    default: 'Research Paper'
  },
  desiredTeamSize: {
    type: Number,
    default: 4,
    min: 2,
    max: 20
  },
  projectGoals: {
    type: String,
    trim: true
  },
  timeline: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Recruiting', 'TeamFormed', 'WorkspaceActive', 'Completed', 'Active', 'Filled', 'Archived'],
    default: 'Recruiting'
  },
  // Inbound join requests sent by candidate users wishing to join this project team
  joinRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      default: 'Researcher',
      trim: true
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: {
      type: Date
    }
  }],
  // Outbound invitations sent by project owner to candidate users
  invitations: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      default: 'Researcher'
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined'],
      default: 'invited'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: {
      type: Date
    }
  }],
  finalTeam: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      default: 'Researcher'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  },
  completedAt: {
    type: Date
  },
  aiEmbedding: {
    type: [Number],
    select: false
  }
}, {
  timestamps: true
});

projectRequirementSchema.index({ owner: 1, status: 1 });
projectRequirementSchema.index({ researchDomain: 1 });
projectRequirementSchema.index({ 'joinRequests.user': 1, 'joinRequests.status': 1 });
projectRequirementSchema.index({ 'finalTeam.user': 1 });

const ProjectRequirement = mongoose.model('ProjectRequirement', projectRequirementSchema);
module.exports = ProjectRequirement;

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Completed'],
    default: 'To Do'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  }
}, { timestamps: true });

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  targetDate: {
    type: Date
  },
  completed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    trim: true
  },
  linkUrl: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

const discussionSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const workspaceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Workspace title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Workspace description is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Planning', 'In Progress', 'Completed', 'On Hold'],
    default: 'In Progress'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectRequirement'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  members: [{
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
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
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
  tasks: [taskSchema],
  milestones: [milestoneSchema],
  notes: [noteSchema],
  discussions: [discussionSchema]
}, {
  timestamps: true
});

workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ isPublic: 1, status: 1 });
workspaceSchema.index({ 'joinRequests.user': 1, 'joinRequests.status': 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);
module.exports = Workspace;

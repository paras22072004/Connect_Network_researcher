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
    default: 'Planning'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  tasks: [taskSchema],
  milestones: [milestoneSchema],
  notes: [noteSchema]
}, {
  timestamps: true
});

workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);
module.exports = Workspace;

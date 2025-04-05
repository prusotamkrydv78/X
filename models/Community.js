const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  coverImage: {
    type: String,
    default: '/img/default-cover.jpg'
  },
  profileImage: {
    type: String,
    default: '/img/default-community.png'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  rules: [{
    title: String,
    description: String
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  topics: [{
    type: String,
    trim: true
  }],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet'
  }],
  pendingMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// Create indexes for efficient querying
CommunitySchema.index({ name: 'text', description: 'text' });
CommunitySchema.index({ slug: 1 });
CommunitySchema.index({ creator: 1 });
CommunitySchema.index({ members: 1 });

module.exports = mongoose.model('Community', CommunitySchema);

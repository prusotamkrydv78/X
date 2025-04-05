const mongoose = require('mongoose');

const TweetSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 280
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  media: [{
    type: String
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  retweets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet'
  }],
  parentTweet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet',
    default: null
  },
  isRetweet: {
    type: Boolean,
    default: false
  },
  retweetedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Tweet', TweetSchema);

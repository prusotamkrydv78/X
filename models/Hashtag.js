const mongoose = require('mongoose');

const HashtagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  count: {
    type: Number,
    default: 1
  },
  tweets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet'
  }],
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create an index for count and lastUsed for efficient trending queries
HashtagSchema.index({ count: -1, lastUsed: -1 });

module.exports = mongoose.model('Hashtag', HashtagSchema);

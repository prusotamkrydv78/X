const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'retweet', 'follow', 'mention', 'reply'],
    required: true
  },
  tweet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet'
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Create a compound index for recipient and createdAt for efficient querying
NotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);

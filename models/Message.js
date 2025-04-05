const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  media: [{
    type: String
  }],
  read: {
    type: Boolean,
    default: false
  },
  conversationId: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Create a compound index for conversationId and createdAt for efficient querying
MessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);

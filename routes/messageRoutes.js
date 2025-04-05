const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  }
});

// Get messages page
router.get('/messages', ensureAuthenticated, async (req, res) => {
  try {
    // Get all users the current user has conversations with
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$recipient', req.user._id] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    // Get user details for each conversation
    const conversationsWithUsers = await Promise.all(conversations.map(async (conv) => {
      const otherUserId = conv.lastMessage.sender.equals(req.user._id)
        ? conv.lastMessage.recipient
        : conv.lastMessage.sender;

      const otherUser = await User.findById(otherUserId).select('name username profileImage');

      return {
        ...conv,
        otherUser
      };
    }));

    res.render('pages/messages', {
      title: 'Messages / X',
      activePage: 'messages',
      conversations: conversationsWithUsers,
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get conversation with a specific user
router.get('/messages/:username', ensureAuthenticated, async (req, res) => {
  try {
    const otherUser = await User.findOne({ username: req.params.username });

    if (!otherUser) {
      return res.status(404).render('pages/404', {
        title: 'User not found / X',
        activePage: '',
        req
      });
    }

    // Create a unique conversation ID (sorted user IDs joined by hyphen)
    const conversationId = [req.user._id, otherUser._id].sort().join('-');

    // Get messages between the two users
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name username profileImage');

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        recipient: req.user._id,
        read: false
      },
      { read: true }
    );

    // Get all conversations for the sidebar
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$recipient', req.user._id] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    // Get user details for each conversation
    const conversationsWithUsers = await Promise.all(conversations.map(async (conv) => {
      const otherUserId = conv.lastMessage.sender.equals(req.user._id)
        ? conv.lastMessage.recipient
        : conv.lastMessage.sender;

      const user = await User.findById(otherUserId).select('name username profileImage');

      return {
        ...conv,
        otherUser: user
      };
    }));

    res.render('pages/conversation', {
      title: `Conversation with ${otherUser.name} / X`,
      activePage: 'messages',
      otherUser,
      messages,
      conversationId,
      conversations: conversationsWithUsers,
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Send a message
router.post('/messages/:username', ensureAuthenticated, upload.array('media', 4), async (req, res) => {
  try {
    const { content } = req.body;
    const otherUser = await User.findOne({ username: req.params.username });

    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a unique conversation ID (sorted user IDs joined by hyphen)
    const conversationId = [req.user._id, otherUser._id].sort().join('-');

    // Process uploaded media
    const media = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    // Create and save the message
    const newMessage = new Message({
      sender: req.user._id,
      recipient: otherUser._id,
      content,
      media,
      conversationId
    });

    await newMessage.save();

    // Get the populated message
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name username profileImage');

    // Emit socket event if Socket.io is available
    if (req.app.get('io')) {
      const io = req.app.get('io');

      // Emit to the conversation room
      io.to(conversationId).emit('newMessage', {
        message: {
          _id: populatedMessage._id,
          sender: populatedMessage.sender._id,
          recipient: populatedMessage.recipient,
          content: populatedMessage.content,
          media: populatedMessage.media,
          createdAt: populatedMessage.createdAt
        },
        user: populatedMessage.sender
      });

      // Emit notification to recipient
      io.to(otherUser._id.toString()).emit('messageNotification', {
        message: populatedMessage,
        user: req.user
      });
    }

    // If AJAX request
    if (req.xhr || req.headers['content-type']?.includes('application/json')) {
      return res.json({
        message: populatedMessage
      });
    }

    // If regular form submission
    res.redirect(`/messages/${otherUser.username}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get unread message count
router.get('/messages/unread/count', ensureAuthenticated, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      read: false
    });

    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;

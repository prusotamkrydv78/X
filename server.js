const express = require('express');
const path = require('path');
const ejsLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const multer = require('multer');
const fs = require('fs');

const http = require('http');
require('dotenv').config();


// Import database connection
const connectDB = require('./config/database');

// Import models
const User = require('./models/User');
const Tweet = require('./models/Tweet');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const Hashtag = require('./models/Hashtag');
const Community = require('./models/Community');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tweetRoutes = require('./routes/tweetRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const searchRoutes = require('./routes/searchRoutes');
const communityRoutes = require('./routes/communityRoutes');
const apiRoutes = require('./routes/apiRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Set up Socket.io
const io = require('socket.io')(server);

// Connect to MongoDB
connectDB();

// Create uploads directory if it doesn't exist
if (!fs.existsSync('./public/uploads')) {
  fs.mkdirSync('./public/uploads', { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layout');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret_key_change_in_production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/twitter-clone' }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

// Flash messages
app.use(flash());

// Passport configuration
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Global variables and helper functions
app.use(async (req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');

  // Fetch trending hashtags for the right sidebar
  try {
    const trendingHashtags = await Hashtag.find()
      .sort({ count: -1 })
      .limit(5);
    res.locals.trendingHashtags = trendingHashtags;
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    res.locals.trendingHashtags = [];
  }

  // Fetch user suggestions if user is logged in
  if (req.isAuthenticated && req.isAuthenticated()) {
    try {
      const suggestedUsers = await User.find({
        _id: { $nin: [...req.user.following, req.user._id] }
      })
      .select('name username profileImage isVerified')
      .sort({ followerCount: -1 })
      .limit(3);
      res.locals.suggestedUsers = suggestedUsers;
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
      res.locals.suggestedUsers = [];
    }
  } else {
    res.locals.suggestedUsers = [];
  }

  // Helper function for time formatting
  res.locals.timeAgo = function(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";

    return Math.floor(seconds) + "s";
  };

  next();
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', tweetRoutes);
app.use('/', messageRoutes);
app.use('/', notificationRoutes);
app.use('/', searchRoutes);
app.use('/', communityRoutes);
app.use('/api', apiRoutes);

// Home route
app.get('/', async (req, res) => {
  try {
    let tweets = [];

    if (req.query.tab === 'following' && req.isAuthenticated()) {
      // Get tweets from users that the current user follows
      const user = await User.findById(req.user._id);
      tweets = await Tweet.find({
        $or: [
          { user: { $in: user.following } },
          { retweetedBy: { $in: user.following } }
        ]
      })
      .populate('user')
      .populate('retweetedBy')
      .sort({ createdAt: -1 });
    } else {
      // Get all tweets for the "For You" tab
      tweets = await Tweet.find({})
        .populate('user')
        .populate('retweetedBy')
        .sort({ createdAt: -1 });
    }

    res.render('pages/index', {
      title: 'Home / X',
      activePage: 'home',
      tweets,
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.get('/explore', async (req, res) => {
  try {
    // Get trending tweets (most liked and retweeted)
    const tweets = await Tweet.aggregate([
      { $addFields: { engagementScore: { $add: [{ $size: "$likes" }, { $size: "$retweets" }] } } },
      { $sort: { engagementScore: -1 } },
      { $limit: 20 }
    ]);

    // Populate user data
    await Tweet.populate(tweets, { path: 'user' });

    res.render('pages/explore', {
      title: 'Explore / X',
      activePage: 'explore',
      tweets,
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.get('/notifications', (req, res) => {
  res.render('pages/notifications', {
    title: 'Notifications / X',
    activePage: 'notifications',
    req
  });
});

app.get('/messages', (req, res) => {
  res.render('pages/messages', {
    title: 'Messages / X',
    activePage: 'messages',
    req
  });
});

app.get('/bookmarks', async (req, res) => {
  // In a real app, this would fetch bookmarked tweets from the database
  res.render('pages/bookmarks', {
    title: 'Bookmarks / X',
    activePage: 'bookmarks',
    req
  });
});

app.get('/communities', (req, res) => {
  res.render('pages/communities', {
    title: 'Communities / X',
    activePage: 'communities',
    req
  });
});

app.get('/premium', (req, res) => {
  res.render('pages/premium', {
    title: 'Premium / X',
    activePage: 'premium',
    req
  });
});

// Redirect /profile to the user's profile page
app.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect(`/users/${req.user.username}`);
  } else {
    res.redirect('/login');
  }
});

// 404 route
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: 'Page Not Found / X',
    activePage: '',
    req
  });
});

// Create HTTP server

// Make io available to routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Store user information
  let currentUser = null;

  // Join a room based on user ID for private notifications
  socket.on('join', (userId) => {
    socket.join(userId);
    currentUser = userId;
    console.log(`User ${userId} joined their private room`);
  });

  // Join a conversation room for private messaging
  socket.on('joinConversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`User joined conversation: ${conversationId}`);
  });

  // Handle new messages
  socket.on('sendMessage', async (data) => {
    try {
      const { sender, recipient, content, media, conversationId } = data;

      // Skip if no content and no media
      if (!content && (!media || media.length === 0)) {
        return;
      }

      // Create a new message
      const newMessage = new Message({
        sender,
        recipient,
        content,
        media: media || [],
        conversationId
      });

      await newMessage.save();

      // Get sender information
      const senderInfo = await User.findById(sender).select('name username profileImage');

      // Emit the message to the conversation room
      io.to(conversationId).emit('newMessage', {
        message: {
          _id: newMessage._id,
          sender: newMessage.sender,
          recipient: newMessage.recipient,
          content: newMessage.content,
          media: newMessage.media,
          createdAt: newMessage.createdAt
        },
        user: senderInfo
      });

      // Send notification to recipient if they're not in the conversation
      io.to(recipient).emit('messageNotification', {
        message: newMessage,
        user: senderInfo
      });

      console.log(`Message sent in conversation ${conversationId}: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { conversationId, isTyping, username } = data;
    socket.to(conversationId).emit('userTyping', { isTyping, username });
  });

  // Handle read receipts
  socket.on('markAsRead', async (data) => {
    try {
      const { conversationId, userId } = data;

      // Update messages as read
      await Message.updateMany(
        { conversationId, recipient: userId, read: false },
        { read: true }
      );

      // Notify the other user that messages were read
      socket.to(conversationId).emit('messagesRead', { userId });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Join community room
  socket.on('joinCommunity', (communityId) => {
    socket.join(`community:${communityId}`);
    console.log(`User joined community: ${communityId}`);
  });

  // Handle community posts
  socket.on('communityPost', async (data) => {
    try {
      const { communityId, tweetId } = data;

      // Emit to all members in the community room
      io.to(`community:${communityId}`).emit('newCommunityPost', { tweetId });
    } catch (error) {
      console.error('Error with community post:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Leave all rooms
    if (currentUser) {
      socket.leave(currentUser);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

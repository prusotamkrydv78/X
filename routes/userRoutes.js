const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Tweet = require('../models/Tweet');
const Notification = require('../models/Notification');
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

// Get user profile
router.get('/users/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.status(404).render('pages/404', {
        title: 'User not found / X',
        activePage: '',
        req
      });
    }

    // Get user's tweets
    const tweets = await Tweet.find({
      $or: [
        { user: user._id, parentTweet: null },
        { retweetedBy: user._id }
      ]
    })
    .populate('user')
    .populate('retweetedBy')
    .sort({ createdAt: -1 });

    // Get tab content based on query parameter
    let tabContent = tweets;
    const tab = req.query.tab || 'posts';

    if (tab === 'replies') {
      tabContent = await Tweet.find({
        user: user._id,
        parentTweet: { $ne: null }
      })
      .populate('user')
      .populate('parentTweet')
      .sort({ createdAt: -1 });
    } else if (tab === 'media') {
      tabContent = await Tweet.find({
        user: user._id,
        media: { $exists: true, $ne: [] }
      })
      .populate('user')
      .sort({ createdAt: -1 });
    } else if (tab === 'likes') {
      // Find tweets that the user has liked
      const likedTweets = await Tweet.find({
        likes: user._id
      })
      .populate('user')
      .sort({ createdAt: -1 });

      tabContent = likedTweets;
    }

    // Check if current user follows this user
    let isFollowing = false;
    if (req.user) {
      isFollowing = user.followers.includes(req.user._id);
    }

    res.render('pages/profile', {
      title: `${user.name} (@${user.username}) / X`,
      profileUser: user,
      tweets: tabContent,
      activeTab: tab,
      isFollowing,
      activePage: req.user && user._id.equals(req.user._id) ? 'profile' : '',
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Follow/unfollow user
router.post('/users/:username/follow', ensureAuthenticated, async (req, res) => {
  try {
    // Can't follow yourself
    if (req.params.username === req.user.username) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const userToFollow = await User.findOne({ username: req.params.username });

    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);

    // Check if already following
    const isFollowing = currentUser.following.includes(userToFollow._id);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== userToFollow._id.toString()
      );
      userToFollow.followers = userToFollow.followers.filter(
        id => id.toString() !== currentUser._id.toString()
      );
    } else {
      // Follow
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);

      // Create notification for followed user
      const notification = new Notification({
        recipient: userToFollow._id,
        sender: currentUser._id,
        type: 'follow'
      });

      await notification.save();

      // Emit real-time notification if socket.io is set up
      if (req.app.get('io')) {
        req.app.get('io').to(userToFollow._id.toString()).emit('notification', {
          notification: await Notification.findById(notification._id)
            .populate('sender', 'name username profileImage')
        });
      }
    }

    await currentUser.save();
    await userToFollow.save();

    // If AJAX request
    if (req.xhr) {
      return res.json({
        isFollowing: !isFollowing,
        followerCount: userToFollow.followers.length
      });
    }

    // If regular form submission
    return res.redirect(`/users/${userToFollow.username}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Edit profile
router.get('/settings/profile', ensureAuthenticated, (req, res) => {
  res.render('pages/edit-profile', {
    title: 'Edit Profile / X',
    activePage: 'profile',
    req
  });
});

// Update profile
router.post('/settings/profile', ensureAuthenticated, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, bio, location, website } = req.body;

    // Get current user
    const user = await User.findById(req.user._id);

    // Update fields
    user.name = name || user.name;
    user.bio = bio || '';
    user.location = location || '';
    user.website = website || '';

    // Update profile image if uploaded
    if (req.files.profileImage) {
      user.profileImage = `/uploads/${req.files.profileImage[0].filename}`;
    }

    // Update cover image if uploaded
    if (req.files.coverImage) {
      user.coverImage = `/uploads/${req.files.coverImage[0].filename}`;
    }

    await user.save();

    res.redirect(`/users/${user.username}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get premium subscription page
router.get('/settings/premium', ensureAuthenticated, (req, res) => {
  res.render('pages/premium', {
    title: 'Premium / X',
    activePage: 'premium',
    req
  });
});

// Subscribe to premium (mock implementation)
router.post('/settings/premium/subscribe', ensureAuthenticated, async (req, res) => {
  try {
    // In a real app, this would handle payment processing
    const user = await User.findById(req.user._id);
    user.isPremium = true;
    user.isVerified = true; // Premium users get verified
    await user.save();

    res.redirect('/settings/premium');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
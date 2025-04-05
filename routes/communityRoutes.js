const express = require('express');
const router = express.Router();
const Community = require('../models/Community');
const User = require('../models/User');
const Tweet = require('../models/Tweet');
const { ensureAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const slugify = require('slugify');

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

// Get communities page
router.get('/communities', async (req, res) => {
  try {
    // Get trending communities
    const trendingCommunities = await Community.find({})
      .sort({ members: -1 })
      .limit(5)
      .populate('creator', 'name username profileImage');

    // Get user's communities if logged in
    let userCommunities = [];
    if (req.isAuthenticated()) {
      userCommunities = await Community.find({ members: req.user._id })
        .populate('creator', 'name username profileImage');
    }

    // Get recommended communities
    const recommendedCommunities = await Community.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('creator', 'name username profileImage');

    res.render('pages/communities', {
      title: 'Communities / X',
      activePage: 'communities',
      trendingCommunities,
      userCommunities,
      recommendedCommunities,
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Create community page
router.get('/communities/create', ensureAuthenticated, (req, res) => {
  res.render('pages/create-community', {
    title: 'Create Community / X',
    activePage: 'communities',
    req
  });
});

// Create community
router.post('/communities', ensureAuthenticated, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, description, topics, isPrivate } = req.body;

    // Create slug from name
    const slug = slugify(name, { lower: true, strict: true });

    // Check if community with this slug already exists
    const existingCommunity = await Community.findOne({ slug });
    if (existingCommunity) {
      req.flash('error', 'A community with this name already exists');
      return res.redirect('/communities/create');
    }

    // Create new community
    const newCommunity = new Community({
      name,
      description,
      slug,
      creator: req.user._id,
      moderators: [req.user._id],
      members: [req.user._id],
      topics: topics ? topics.split(',').map(topic => topic.trim()) : [],
      isPrivate: isPrivate === 'on'
    });

    // Add profile image if uploaded
    if (req.files.profileImage) {
      newCommunity.profileImage = `/uploads/${req.files.profileImage[0].filename}`;
    }

    // Add cover image if uploaded
    if (req.files.coverImage) {
      newCommunity.coverImage = `/uploads/${req.files.coverImage[0].filename}`;
    }

    await newCommunity.save();

    res.redirect(`/communities/${newCommunity.slug}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error creating community');
    res.redirect('/communities/create');
  }
});

// Get community page
router.get('/communities/:slug', async (req, res) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug })
      .populate('creator', 'name username profileImage isVerified')
      .populate('moderators', 'name username profileImage isVerified')
      .populate({
        path: 'members',
        select: 'name username profileImage isVerified'
      });

    if (!community) {
      return res.status(404).render('pages/404', {
        title: 'Community not found / X',
        activePage: '',
        req
      });
    }

    // Check if user is a member
    let isMember = false;
    let isPending = false;

    if (req.isAuthenticated()) {
      isMember = community.members.some(member => member._id.equals(req.user._id));
      isPending = community.pendingMembers.includes(req.user._id);
    }

    // Get community posts
    const posts = await Tweet.find({ community: community._id })
      .populate('user', 'name username profileImage isVerified')
      .populate('retweetedBy', 'name username profileImage')
      .sort({ createdAt: -1 });

    // Determine which tab is active
    const tab = req.query.tab || 'posts';

    res.render('pages/community', {
      title: `${community.name} / X`,
      activePage: 'communities',
      community,
      posts,
      isMember,
      isPending,
      isCreator: req.user && community.creator._id.equals(req.user._id),
      isModerator: req.user && community.moderators.some(mod => mod._id.equals(req.user._id)),
      tab,
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Join community
router.post('/communities/:slug/join', ensureAuthenticated, async (req, res) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is already a member
    if (community.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member' });
    }

    // If private community, add to pending
    if (community.isPrivate) {
      // Check if already pending
      if (community.pendingMembers.includes(req.user._id)) {
        return res.status(400).json({ message: 'Join request already pending' });
      }

      community.pendingMembers.push(req.user._id);
      await community.save();

      // If AJAX request
      if (req.xhr) {
        return res.json({ isPending: true });
      }

      // If regular form submission
      return res.redirect(`/communities/${community.slug}`);
    }

    // For public communities, add directly
    community.members.push(req.user._id);
    await community.save();

    // If AJAX request
    if (req.xhr) {
      return res.json({ isMember: true });
    }

    // If regular form submission
    return res.redirect(`/communities/${community.slug}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Leave community
router.post('/communities/:slug/leave', ensureAuthenticated, async (req, res) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is a member
    if (!community.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Not a member' });
    }

    // Can't leave if you're the creator
    if (community.creator.equals(req.user._id)) {
      return res.status(400).json({ message: 'Creator cannot leave community' });
    }

    // Remove from members
    community.members = community.members.filter(id => !id.equals(req.user._id));

    // Remove from moderators if applicable
    if (community.moderators.includes(req.user._id)) {
      community.moderators = community.moderators.filter(id => !id.equals(req.user._id));
    }

    await community.save();

    // If AJAX request
    if (req.xhr) {
      return res.json({ isMember: false });
    }

    // If regular form submission
    return res.redirect(`/communities/${community.slug}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Post to community
router.post('/communities/:slug/post', ensureAuthenticated, upload.array('media', 4), async (req, res) => {
  try {
    const { content } = req.body;
    const community = await Community.findOne({ slug: req.params.slug });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is a member
    if (!community.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Must be a member to post' });
    }

    // Process uploaded media
    const media = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    // Create new tweet
    const newTweet = new Tweet({
      content,
      user: req.user._id,
      media,
      community: community._id
    });

    await newTweet.save();

    // Add to community posts
    community.posts.push(newTweet._id);
    await community.save();

    res.redirect(`/communities/${community.slug}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Approve pending member (moderators only)
router.post('/communities/:slug/approve/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is a moderator
    if (!community.moderators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const userId = req.params.userId;

    // Check if user is in pending list
    if (!community.pendingMembers.includes(userId)) {
      return res.status(400).json({ message: 'User not in pending list' });
    }

    // Move from pending to members
    community.pendingMembers = community.pendingMembers.filter(id => id.toString() !== userId);
    community.members.push(userId);

    await community.save();

    // If AJAX request
    if (req.xhr) {
      return res.json({ success: true });
    }

    // If regular form submission
    return res.redirect(`/communities/${community.slug}/manage`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Manage community page (moderators only)
router.get('/communities/:slug/manage', ensureAuthenticated, async (req, res) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug })
      .populate('creator', 'name username profileImage')
      .populate('moderators', 'name username profileImage')
      .populate('members', 'name username profileImage')
      .populate('pendingMembers', 'name username profileImage');

    if (!community) {
      return res.status(404).render('pages/404', {
        title: 'Community not found / X',
        activePage: '',
        req
      });
    }

    // Check if user is a moderator
    if (!community.moderators.includes(req.user._id)) {
      return res.status(403).redirect(`/communities/${community.slug}`);
    }

    res.render('pages/manage-community', {
      title: `Manage ${community.name} / X`,
      activePage: 'communities',
      community,
      isCreator: community.creator._id.equals(req.user._id),
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Update community
router.post('/communities/:slug/update', ensureAuthenticated, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, description, topics, isPrivate } = req.body;
    const community = await Community.findOne({ slug: req.params.slug });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is a moderator
    if (!community.moderators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update fields
    community.name = name || community.name;
    community.description = description || community.description;
    community.topics = topics ? topics.split(',').map(topic => topic.trim()) : community.topics;
    community.isPrivate = isPrivate === 'on';

    // Update profile image if uploaded
    if (req.files.profileImage) {
      community.profileImage = `/uploads/${req.files.profileImage[0].filename}`;
    }

    // Update cover image if uploaded
    if (req.files.coverImage) {
      community.coverImage = `/uploads/${req.files.coverImage[0].filename}`;
    }

    await community.save();

    res.redirect(`/communities/${community.slug}/manage`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

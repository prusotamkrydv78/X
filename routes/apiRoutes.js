const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Tweet = require('../models/Tweet');
const Hashtag = require('../models/Hashtag');
const Community = require('../models/Community');
const { ensureAuthenticated } = require('../middleware/auth');

// Search users API endpoint
router.get('/users/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    // Search for users
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name username profileImage')
    .limit(10);

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Comprehensive search API endpoint
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        users: [],
        tweets: [],
        hashtags: [],
        communities: []
      });
    }

    // Search for users
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name username profileImage isVerified')
    .limit(5);

    // Search for tweets
    const tweets = await Tweet.find({
      content: { $regex: q, $options: 'i' }
    })
    .populate('user', 'name username profileImage isVerified')
    .sort({ createdAt: -1 })
    .limit(5);

    // Search for hashtags
    let hashtags = [];
    if (q.startsWith('#')) {
      hashtags = await Hashtag.find({
        name: { $regex: q.substring(1), $options: 'i' }
      })
      .sort({ count: -1 })
      .limit(5);
    } else {
      hashtags = await Hashtag.find({
        name: { $regex: q, $options: 'i' }
      })
      .sort({ count: -1 })
      .limit(5);
    }

    // Search for communities
    const communities = await Community.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { topics: { $in: [new RegExp(q, 'i')] } }
      ],
      isPrivate: false
    })
    .populate('creator', 'name username')
    .select('name slug description profileImage memberCount')
    .limit(5);

    res.json({
      users,
      tweets,
      hashtags,
      communities
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user suggestions
router.get('/users/suggestions', ensureAuthenticated, async (req, res) => {
  try {
    // Get users that the current user is not following
    const user = await User.findById(req.user._id);

    // Find users that the current user is not following
    const suggestions = await User.find({
      _id: { $nin: [...user.following, req.user._id] }
    })
    .select('name username profileImage isVerified')
    .sort({ followerCount: -1 }) // Suggest popular users first
    .limit(3);

    res.json(suggestions);
  } catch (error) {
    console.error('Error getting user suggestions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get trending hashtags
router.get('/trending/hashtags', async (req, res) => {
  try {
    const hashtags = await Hashtag.find()
      .sort({ count: -1 })
      .limit(5);

    res.json(hashtags);
  } catch (error) {
    console.error('Error getting trending hashtags:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user followers for community invites
router.get('/users/:username/followers', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the requesting user is the profile owner
    if (!user._id.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get followers
    const followers = await User.find({ _id: { $in: user.followers } })
      .select('name username profileImage')
      .limit(50);

    res.json(followers);
  } catch (error) {
    console.error('Error getting followers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user following for community invites
router.get('/users/:username/following', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the requesting user is the profile owner
    if (!user._id.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get following
    const following = await User.find({ _id: { $in: user.following } })
      .select('name username profileImage')
      .limit(50);

    res.json(following);
  } catch (error) {
    console.error('Error getting following:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Invite user to community
router.post('/communities/:slug/invite', ensureAuthenticated, async (req, res) => {
  try {
    const { userIds } = req.body;
    const community = await Community.findOne({ slug: req.params.slug });

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Check if user is a member or moderator
    if (!community.members.includes(req.user._id) && !community.moderators.includes(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to invite users' });
    }

    // Process invites
    const results = {
      success: [],
      alreadyMember: [],
      alreadyInvited: [],
      failed: []
    };

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);

        if (!user) {
          results.failed.push(userId);
          continue;
        }

        // Check if already a member
        if (community.members.includes(userId)) {
          results.alreadyMember.push(userId);
          continue;
        }

        // Check if already invited
        if (community.pendingMembers.includes(userId)) {
          results.alreadyInvited.push(userId);
          continue;
        }

        // Add to pending members
        community.pendingMembers.push(userId);
        results.success.push(userId);

        // Create notification for the invited user
        const notification = new Notification({
          recipient: userId,
          sender: req.user._id,
          type: 'community_invite',
          community: community._id
        });

        await notification.save();
      } catch (error) {
        console.error('Error processing invite:', error);
        results.failed.push(userId);
      }
    }

    await community.save();

    res.json(results);
  } catch (error) {
    console.error('Error inviting users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

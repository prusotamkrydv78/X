const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Tweet = require('../models/Tweet');
const Hashtag = require('../models/Hashtag');
const Community = require('../models/Community');

// Search page
router.get('/search', async (req, res) => {
  try {
    const { q, type } = req.query;
    let results = [];
    let activeTab = type || 'top';

    if (q) {
      if (activeTab === 'users' || activeTab === 'top') {
        // Search for users
        const users = await User.find({
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { username: { $regex: q, $options: 'i' } },
            { bio: { $regex: q, $options: 'i' } }
          ]
        }).limit(activeTab === 'top' ? 3 : 20);

        if (activeTab === 'users') {
          results = users;
        } else {
          results.users = users;
        }
      }

      if (activeTab === 'tweets' || activeTab === 'top') {
        // Search for tweets
        const tweets = await Tweet.find({
          content: { $regex: q, $options: 'i' }
        })
        .populate('user')
        .populate('retweetedBy')
        .sort({ createdAt: -1 })
        .limit(activeTab === 'top' ? 5 : 20);

        if (activeTab === 'tweets') {
          results = tweets;
        } else {
          results.tweets = tweets;
        }
      }

      if (activeTab === 'media' || activeTab === 'top') {
        // Search for tweets with media
        const mediaTweets = await Tweet.find({
          content: { $regex: q, $options: 'i' },
          media: { $exists: true, $ne: [] }
        })
        .populate('user')
        .populate('retweetedBy')
        .sort({ createdAt: -1 })
        .limit(activeTab === 'top' ? 4 : 20);

        if (activeTab === 'media') {
          results = mediaTweets;
        } else {
          results.media = mediaTweets;
        }
      }

      if (q.startsWith('#') && (activeTab === 'hashtags' || activeTab === 'top')) {
        // Search for hashtags
        const hashtagQuery = q.substring(1); // Remove the # symbol
        const hashtags = await Hashtag.find({
          name: { $regex: hashtagQuery, $options: 'i' }
        })
        .sort({ count: -1 })
        .limit(activeTab === 'top' ? 5 : 20);

        if (activeTab === 'hashtags') {
          results = hashtags;
        } else {
          results.hashtags = hashtags;
        }
      }

      if (activeTab === 'communities' || activeTab === 'top') {
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
        .limit(activeTab === 'top' ? 3 : 20);

        if (activeTab === 'communities') {
          results = communities;
        } else {
          results.communities = communities;
        }
      }
    }

    // Trending hashtags are now fetched globally in server.js

    res.render('pages/search-results', {
      title: `${q ? `"${q}" - ` : ''}Search / X`,
      activePage: 'explore',
      query: q,
      tab: activeTab,
      results,
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get trending hashtags
router.get('/trending', async (req, res) => {
  try {
    const hashtags = await Hashtag.find()
      .sort({ count: -1, lastUsed: -1 })
      .limit(10);

    res.json(hashtags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get tweets by hashtag
router.get('/hashtag/:name', async (req, res) => {
  try {
    const hashtag = await Hashtag.findOne({ name: req.params.name.toLowerCase() });

    if (!hashtag) {
      return res.status(404).render('pages/404', {
        title: 'Hashtag not found / X',
        activePage: '',
        req
      });
    }

    // Get tweets with this hashtag
    const tweets = await Tweet.find({ _id: { $in: hashtag.tweets } })
      .populate('user')
      .populate('retweetedBy')
      .sort({ createdAt: -1 });

    // Get trending hashtags for the sidebar
    const trendingHashtags = await Hashtag.find()
      .sort({ count: -1, lastUsed: -1 })
      .limit(5);

    res.render('pages/hashtag', {
      title: `#${hashtag.name} / X`,
      activePage: 'explore',
      hashtag,
      tweets,
      trendingHashtags,
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

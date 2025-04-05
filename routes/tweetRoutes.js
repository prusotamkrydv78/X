const express = require('express');
const router = express.Router();
const Tweet = require('../models/Tweet');
const User = require('../models/User');
const Hashtag = require('../models/Hashtag');
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

// Create a tweet
router.post('/tweets', ensureAuthenticated, upload.array('media', 4), async (req, res) => {
  try {
    const { content } = req.body;
    const media = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const newTweet = new Tweet({
      content,
      user: req.user._id,
      media
    });

    await newTweet.save();

    // Extract hashtags from content
    const hashtagRegex = /#(\w+)/g;
    const hashtags = content.match(hashtagRegex);

    if (hashtags) {
      // Process each hashtag
      for (const tag of hashtags) {
        const hashtagName = tag.substring(1).toLowerCase(); // Remove the # symbol

        // Find or create hashtag
        let hashtag = await Hashtag.findOne({ name: hashtagName });

        if (hashtag) {
          // Update existing hashtag
          hashtag.count += 1;
          hashtag.lastUsed = Date.now();
          hashtag.tweets.push(newTweet._id);
        } else {
          // Create new hashtag
          hashtag = new Hashtag({
            name: hashtagName,
            tweets: [newTweet._id]
          });
        }

        await hashtag.save();
      }
    }

    // Extract mentions from content
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);

    if (mentions) {
      // Process each mention
      for (const mention of mentions) {
        const username = mention.substring(1).toLowerCase(); // Remove the @ symbol

        // Find mentioned user
        const mentionedUser = await User.findOne({ username });

        if (mentionedUser && !mentionedUser._id.equals(req.user._id)) {
          // Create notification for mentioned user
          const notification = new Notification({
            recipient: mentionedUser._id,
            sender: req.user._id,
            type: 'mention',
            tweet: newTweet._id
          });

          await notification.save();

          // Emit real-time notification if socket.io is set up
          if (req.app.get('io')) {
            req.app.get('io').to(mentionedUser._id.toString()).emit('notification', {
              notification: await Notification.findById(notification._id)
                .populate('sender', 'name username profileImage')
                .populate({
                  path: 'tweet',
                  populate: { path: 'user', select: 'name username profileImage' }
                })
            });
          }
        }
      }
    }

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Like a tweet
router.post('/tweets/:id/like', ensureAuthenticated, async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.id);

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    // Check if user already liked the tweet
    const alreadyLiked = tweet.likes.includes(req.user._id);

    if (alreadyLiked) {
      // Unlike
      tweet.likes = tweet.likes.filter(like => like.toString() !== req.user._id.toString());
    } else {
      // Like
      tweet.likes.push(req.user._id);

      // Create notification for tweet owner (if not the same as liker)
      if (!tweet.user.equals(req.user._id)) {
        const notification = new Notification({
          recipient: tweet.user,
          sender: req.user._id,
          type: 'like',
          tweet: tweet._id
        });

        await notification.save();

        // Emit real-time notification if socket.io is set up
        if (req.app.get('io')) {
          req.app.get('io').to(tweet.user.toString()).emit('notification', {
            notification: await Notification.findById(notification._id)
              .populate('sender', 'name username profileImage')
              .populate({
                path: 'tweet',
                populate: { path: 'user', select: 'name username profileImage' }
              })
          });
        }
      }
    }

    await tweet.save();

    // If AJAX request
    if (req.xhr) {
      return res.json({
        likes: tweet.likes.length,
        liked: !alreadyLiked
      });
    }

    // If regular form submission
    return res.redirect('back');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Retweet
router.post('/tweets/:id/retweet', ensureAuthenticated, async (req, res) => {
  try {
    const originalTweet = await Tweet.findById(req.params.id);

    if (!originalTweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    // Check if user already retweeted
    const existingRetweet = await Tweet.findOne({
      user: req.user._id,
      isRetweet: true,
      parentTweet: originalTweet._id
    });

    let didRetweet = false;

    if (existingRetweet) {
      // Undo retweet
      await Tweet.findByIdAndDelete(existingRetweet._id);
      originalTweet.retweets = originalTweet.retweets.filter(
        rt => rt.toString() !== req.user._id.toString()
      );
    } else {
      // Create retweet
      const retweet = new Tweet({
        content: originalTweet.content,
        user: originalTweet.user,
        media: originalTweet.media,
        isRetweet: true,
        retweetedBy: req.user._id,
        parentTweet: originalTweet._id
      });

      await retweet.save();
      originalTweet.retweets.push(req.user._id);
      didRetweet = true;

      // Create notification for tweet owner (if not the same as retweeter)
      if (!originalTweet.user.equals(req.user._id)) {
        const notification = new Notification({
          recipient: originalTweet.user,
          sender: req.user._id,
          type: 'retweet',
          tweet: originalTweet._id
        });

        await notification.save();

        // Emit real-time notification if socket.io is set up
        if (req.app.get('io')) {
          req.app.get('io').to(originalTweet.user.toString()).emit('notification', {
            notification: await Notification.findById(notification._id)
              .populate('sender', 'name username profileImage')
              .populate({
                path: 'tweet',
                populate: { path: 'user', select: 'name username profileImage' }
              })
          });
        }
      }
    }

    await originalTweet.save();

    // If AJAX request
    if (req.xhr) {
      return res.json({
        retweets: originalTweet.retweets.length,
        retweeted: didRetweet
      });
    }

    // If regular form submission
    return res.redirect('back');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Reply to a tweet
router.post('/tweets/:id/reply', ensureAuthenticated, upload.array('media', 4), async (req, res) => {
  try {
    const { content } = req.body;
    const parentTweet = await Tweet.findById(req.params.id);

    if (!parentTweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    const media = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const reply = new Tweet({
      content,
      user: req.user._id,
      media,
      parentTweet: parentTweet._id
    });

    await reply.save();

    // Add reply to parent tweet's replies array
    parentTweet.replies.push(reply._id);
    await parentTweet.save();

    // Create notification for parent tweet owner (if not the same as replier)
    if (!parentTweet.user.equals(req.user._id)) {
      const notification = new Notification({
        recipient: parentTweet.user,
        sender: req.user._id,
        type: 'reply',
        tweet: parentTweet._id
      });

      await notification.save();

      // Emit real-time notification if socket.io is set up
      if (req.app.get('io')) {
        req.app.get('io').to(parentTweet.user.toString()).emit('notification', {
          notification: await Notification.findById(notification._id)
            .populate('sender', 'name username profileImage')
            .populate({
              path: 'tweet',
              populate: { path: 'user', select: 'name username profileImage' }
            })
        });
      }
    }

    // Extract hashtags from content
    const hashtagRegex = /#(\w+)/g;
    const hashtags = content.match(hashtagRegex);

    if (hashtags) {
      // Process each hashtag
      for (const tag of hashtags) {
        const hashtagName = tag.substring(1).toLowerCase(); // Remove the # symbol

        // Find or create hashtag
        let hashtag = await Hashtag.findOne({ name: hashtagName });

        if (hashtag) {
          // Update existing hashtag
          hashtag.count += 1;
          hashtag.lastUsed = Date.now();
          hashtag.tweets.push(reply._id);
        } else {
          // Create new hashtag
          hashtag = new Hashtag({
            name: hashtagName,
            tweets: [reply._id]
          });
        }

        await hashtag.save();
      }
    }

    // Extract mentions from content
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);

    if (mentions) {
      // Process each mention
      for (const mention of mentions) {
        const username = mention.substring(1).toLowerCase(); // Remove the @ symbol

        // Find mentioned user
        const mentionedUser = await User.findOne({ username });

        if (mentionedUser && !mentionedUser._id.equals(req.user._id) && !mentionedUser._id.equals(parentTweet.user)) {
          // Create notification for mentioned user
          const notification = new Notification({
            recipient: mentionedUser._id,
            sender: req.user._id,
            type: 'mention',
            tweet: reply._id
          });

          await notification.save();

          // Emit real-time notification if socket.io is set up
          if (req.app.get('io')) {
            req.app.get('io').to(mentionedUser._id.toString()).emit('notification', {
              notification: await Notification.findById(notification._id)
                .populate('sender', 'name username profileImage')
                .populate({
                  path: 'tweet',
                  populate: { path: 'user', select: 'name username profileImage' }
                })
            });
          }
        }
      }
    }

    res.redirect(`/tweets/${parentTweet._id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get single tweet with replies
router.get('/tweets/:id', async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.id)
      .populate('user')
      .populate({
        path: 'replies',
        populate: { path: 'user' }
      });

    if (!tweet) {
      return res.status(404).render('pages/404', {
        title: 'Not Found / X',
        activePage: '',
        req
      });
    }

    res.render('pages/tweet', {
      title: `${tweet.user.name} on X: "${tweet.content.substring(0, 50)}${tweet.content.length > 50 ? '...' : ''}"`,
      tweet,
      activePage: '',
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Delete a tweet
router.delete('/tweets/:id', ensureAuthenticated, async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.id);

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    // Check if user owns the tweet
    if (tweet.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Tweet.findByIdAndDelete(req.params.id);

    // If AJAX request
    if (req.xhr) {
      return res.json({ success: true });
    }

    // If regular form submission
    return res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

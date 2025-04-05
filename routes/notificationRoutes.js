const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { ensureAuthenticated } = require('../middleware/auth');

// Get notifications page
router.get('/notifications', ensureAuthenticated, async (req, res) => {
  try {
    // Get all notifications for the current user
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name username profileImage isVerified')
      .populate({
        path: 'tweet',
        populate: { path: 'user', select: 'name username profileImage isVerified' }
      })
      .sort({ createdAt: -1 });
    
    // Mark all notifications as read
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    
    res.render('pages/notifications', {
      title: 'Notifications / X',
      activePage: 'notifications',
      notifications,
      req
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get unread notification count
router.get('/notifications/unread/count', ensureAuthenticated, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });
    
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Mark a notification as read
router.put('/notifications/:id/read', ensureAuthenticated, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user owns the notification
    if (!notification.recipient.equals(req.user._id)) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Mark all notifications as read
router.put('/notifications/read/all', ensureAuthenticated, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete a notification
router.delete('/notifications/:id', ensureAuthenticated, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user owns the notification
    if (!notification.recipient.equals(req.user._id)) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    await Notification.findByIdAndDelete(req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;

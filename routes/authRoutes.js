const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const { ensureAuthenticated, ensureNotAuthenticated } = require('../middleware/auth');

// Login page
router.get('/login', ensureNotAuthenticated, (req, res) => {
  res.render('pages/login', {
    title: 'Login / X',
    layout: 'auth-layout',
    error: req.flash ? req.flash('error') : null,
    req
  });
});

// Login process
router.post('/login', ensureNotAuthenticated, (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

// Signup page
router.get('/signup', ensureNotAuthenticated, (req, res) => {
  res.render('pages/signup', {
    title: 'Sign up / X',
    layout: 'auth-layout',
    error: req.flash ? req.flash('error') : null,
    req
  });
});

// Signup process
router.post('/signup', ensureNotAuthenticated, async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    // Check if email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      if (req.flash) req.flash('error', 'Email or username already in use');
      return res.redirect('/signup');
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      username,
      password
    });

    await newUser.save();

    // Auto login after signup
    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/');
    });
  } catch (error) {
    console.error(error);
    if (req.flash) req.flash('error', 'An error occurred during registration');
    res.redirect('/signup');
  }
});

// Logout
router.get('/logout', ensureAuthenticated, (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

module.exports = router;
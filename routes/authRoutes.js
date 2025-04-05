const express = require('express');
const router = express.Router();

// Login route
router.get('/login', (req, res) => {
  res.render('pages/login', { 
    title: 'Login / X',
    layout: 'auth-layout',
    req
  });
});

// Signup route
router.get('/signup', (req, res) => {
  res.render('pages/signup', { 
    title: 'Sign up / X',
    layout: 'auth-layout',
    req
  });
});

// Logout route
router.get('/logout', (req, res) => {
  // In a real app, would destroy the session
  res.redirect('/');
});

module.exports = router; 
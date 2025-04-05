const express = require('express');
const path = require('path');
const ejsLayouts = require('express-ejs-layouts');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 4000;

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layout');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Very simple routes - no data passing from routes
app.get('/', (req, res) => {
  res.render('pages/index', { 
    title: 'Home / X',
    activePage: 'home',
    req
  });
});

app.get('/explore', (req, res) => {
  res.render('pages/explore', { 
    title: 'Explore / X',
    activePage: 'explore',
    req
  });
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

app.get('/bookmarks', (req, res) => {
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

app.get('/profile', (req, res) => {
  res.render('pages/profile', { 
    title: 'Profile / X',
    activePage: 'profile',
    req
  });
});

app.get('/login', (req, res) => {
  res.render('pages/login', { 
    title: 'Login / X',
    layout: 'auth-layout'
  });
});

app.get('/signup', (req, res) => {
  res.render('pages/signup', { 
    title: 'Sign up / X',
    layout: 'auth-layout'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
 





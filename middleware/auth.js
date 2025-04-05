// Authentication middleware
module.exports = {
  // Ensure user is authenticated
  ensureAuthenticated: (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  },
  
  // Ensure user is not authenticated (for login/signup pages)
  ensureNotAuthenticated: (req, res, next) => {
    if (!req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  }
};

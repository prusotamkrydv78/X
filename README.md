# Twitter/X Clone

A fully functional Twitter/X clone built with Node.js, Express, MongoDB, and EJS.

## Features

- **User Authentication**: Register, login, and logout functionality
- **Profile Management**: Edit profile, upload profile and cover images
- **Tweet Functionality**: Create, like, retweet, and reply to tweets
- **Media Support**: Upload images with tweets
- **Follow System**: Follow/unfollow users
- **Timeline**: View tweets from followed users
- **Responsive Design**: Works on mobile and desktop

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd twitter-clone
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=4000
   MONGODB_URI=mongodb://localhost:27017/twitter-clone
   SESSION_SECRET=your_session_secret_key_change_in_production
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:4000`

## Project Structure

- `config/` - Configuration files for database and passport
- `middleware/` - Custom middleware functions
- `models/` - MongoDB models
- `public/` - Static assets (CSS, JS, images)
- `routes/` - Express routes
- `views/` - EJS templates
  - `layouts/` - Layout templates
  - `pages/` - Page templates
  - `partials/` - Reusable components

## Deployment

This application can be deployed to any Node.js hosting platform such as:

- Heroku
- Vercel
- Railway
- Render
- DigitalOcean

Make sure to set the environment variables in your hosting platform's dashboard.

## License

This project is licensed under the ISC License.

## Acknowledgements

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Passport.js](http://www.passportjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Font Awesome](https://fontawesome.com/)

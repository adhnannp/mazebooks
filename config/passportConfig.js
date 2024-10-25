const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const User = require('../models/userModel'); // Adjust the path according to your project structure

passport.serializeUser((user, done) => {
    done(null, user.id);  // Serialize the user by their ID
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id); // Use async/await instead of a callback
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.YOUR_GOOGLE_CLIENT_ID,
    clientSecret: process.env.YOUR_GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if the user already exists in the database
        let existingUser = await User.findOne({ Email: profile.emails[0].value });
        
        if (existingUser) {
            // If user exists, return the user
            return done(null, existingUser);
        }

        // If user doesn't exist, create a new user
        const newUser = new User({
            Email: profile.emails[0].value,
            FirstName: profile.name.givenName,
            LastName: profile.name.familyName,
            CreatedAt: new Date(),
            UpdatedAt: new Date(),
            Password: '', // Google OAuth users typically don't need a password
            Is_verified: true // Assuming users signing in with Google are verified
        });

        await newUser.save();
        return done(null, newUser);
    } catch (err) {
        return done(err, false);
    }
}));

module.exports = passport;

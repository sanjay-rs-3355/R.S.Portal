const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const db = require('./db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function handleSocialLogin(profile, cb, provider) {
    try {
        let email = '';
        let name = profile.displayName || profile.username || 'User';
        let profileImage = null;

        if (profile.emails && profile.emails.length > 0) {
            email = profile.emails[0].value;
        } else {
            // If no email provided by OAuth (common with Github), fake one using ID
            email = `${profile.id}@${provider}.auth`;
        }

        // Extract profile image from different providers
        if (profile.photos && profile.photos.length > 0) {
            profileImage = profile.photos[0].value;
        }

        // Check if user exists by email
        const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        let user;

        if (existing.length > 0) {
            user = existing[0];
            // Unified account logic: if existing, just update last login or leave as is
        } else {
            // Create new member user with a random complex password
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            const role = 'member';
            const designation = 'Member';

            const [result] = await db.execute(
                'INSERT INTO users (name, email, password, role, designation, profile_image) VALUES (?, ?, ?, ?, ?, ?)',
                [name, email, hashedPassword, role, designation, profileImage]
            );

            // Fetch newly created user
            const [newUser] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
            user = newUser[0];
        }

        return cb(null, user);
    } catch (err) {
        return cb(err, null);
    }
}

const setupPassport = () => {
    // Google Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/api/auth/google/callback",
            passReqToCallback: true,
            proxy: true
        }, (req, accessToken, refreshToken, profile, cb) => handleSocialLogin(profile, cb, 'google')));
    }

    // GitHub Strategy
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        passport.use(new GitHubStrategy({
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: "/api/auth/github/callback",
            scope: ['user:email'],
            proxy: true
        }, (accessToken, refreshToken, profile, cb) => handleSocialLogin(profile, cb, 'github')));
    }

    // Facebook Strategy
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
        passport.use(new FacebookStrategy({
            clientID: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            callbackURL: "/api/auth/facebook/callback",
            profileFields: ['id', 'displayName', 'emails'],
            proxy: true
        }, (accessToken, refreshToken, profile, cb) => handleSocialLogin(profile, cb, 'facebook')));
    }
};

module.exports = setupPassport;

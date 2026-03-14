const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { validateLogin, validateRegister } = require('../middleware/validationMiddleware');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

const passport = require('passport');
const jwt = require('jsonwebtoken');

// OAuth helper token generator
const generateOAuthToken = (user, res) => {
    const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role, email: user.email, designation: user.designation },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
    // Redirect back to frontend with token in the URL hash or query
    res.redirect(`/?token=${token}`);
};

// ---------------- Google OAuth ----------------
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/index.html?error=google_auth_failed' }),
    (req, res) => generateOAuthToken(req.user, res)
);

// ---------------- GitHub OAuth ----------------
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/index.html?error=github_auth_failed' }),
    (req, res) => generateOAuthToken(req.user, res)
);

// ---------------- Facebook OAuth ----------------
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false, failureRedirect: '/index.html?error=facebook_auth_failed' }),
    (req, res) => generateOAuthToken(req.user, res)
);

module.exports = router;


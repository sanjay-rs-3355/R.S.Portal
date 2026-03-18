const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authController = require('../controllers/authController');
const { validateLogin, validateRegister } = require('../middleware/validationMiddleware');

// Multer storage for profile images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed!'), false);
        }
    }
});

// Use multer BEFORE validation for FormData
router.post('/register', upload.single('profile_image'), validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

const passport = require('passport');
const jwt = require('jsonwebtoken');

// OAuth helper token generator
const generateOAuthToken = (user, res) => {
    const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role, email: user.email, designation: user.designation, profile_image: user.profile_image },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
    // Redirect back to frontend with token in the URL query
    // FRONTEND_URL should be set in Render env vars to https://r-s-portal.vercel.app (or wherever the frontend is)
    const frontendUrl = process.env.FRONTEND_URL || '';
    res.redirect(`${frontendUrl}/?token=${token}`);
};

// ---------------- Google OAuth ----------------
router.get('/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) return res.redirect('/index.html?error=Google_OAuth_not_configured');
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/index.html?error=google_auth_failed' }),
    (req, res) => generateOAuthToken(req.user, res)
);

// ---------------- GitHub OAuth ----------------
router.get('/github', (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID) return res.redirect('/index.html?error=GitHub_OAuth_not_configured');
    passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/index.html?error=github_auth_failed' }),
    (req, res) => generateOAuthToken(req.user, res)
);

// ---------------- Facebook OAuth ----------------
router.get('/facebook', (req, res, next) => {
    if (!process.env.FACEBOOK_APP_ID) return res.redirect('/index.html?error=Facebook_OAuth_not_configured');
    passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});
router.get('/facebook/callback', passport.authenticate('facebook', { session: false, failureRedirect: '/index.html?error=facebook_auth_failed' }),
    (req, res) => generateOAuthToken(req.user, res)
);

module.exports = router;


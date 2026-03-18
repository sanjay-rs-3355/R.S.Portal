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


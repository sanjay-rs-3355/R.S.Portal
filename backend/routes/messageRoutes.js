const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const requireProjectMember = require('../middleware/projectMiddleware');
const messageController = require('../controllers/messageController');

router.get('/projects/:id/messages',
    verifyToken,
    requireProjectMember,
    messageController.getMessages
);

module.exports = router;

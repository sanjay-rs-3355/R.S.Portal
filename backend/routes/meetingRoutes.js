const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const meetingController = require('../controllers/meetingController');

// All endpoints require authentication
router.use(verifyToken);

// Get meetings for a specific project
router.get('/', meetingController.getMeetings);

// Create meeting (allowed for all authenticated users)
router.post('/', meetingController.createMeeting);

module.exports = router;

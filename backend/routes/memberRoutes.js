const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const { requireAdmin, requireManager } = require('../middleware/roleMiddleware');
const requireProjectMember = require('../middleware/projectMiddleware');

const memberController = require('../controllers/memberController');

// Add member
router.post('/projects/:id/members',
    verifyToken,
    requireManager,
    memberController.addMember
);

// Remove member
router.delete('/projects/:id/members/:userId',
    verifyToken,
    requireManager,
    memberController.removeMember
);

// Get project members
router.get('/projects/:id/members',
    verifyToken,
    requireProjectMember,
    memberController.getProjectMembers
);

module.exports = router;

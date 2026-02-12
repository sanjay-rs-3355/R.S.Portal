const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/roleMiddleware');
const requireProjectMember = require('../middleware/projectMiddleware');

const projectController = require('../controllers/projectController');

// Create project (Admin only)
router.post('/', verifyToken, requireAdmin, projectController.createProject);

// Get all projects
router.get('/', verifyToken, projectController.getProjects);

// Get single project
router.get('/:id', verifyToken, requireProjectMember, projectController.getProjectById);

// Soft delete project
router.delete('/:id', verifyToken, requireAdmin, projectController.deleteProject);

module.exports = router;
router.put('/:projectId/transfer/:newAdminId',verifyToken,requireAdmin,projectController.transferOwnership);

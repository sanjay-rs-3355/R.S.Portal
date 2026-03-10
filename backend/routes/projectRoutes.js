const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const requireProjectMember = require('../middleware/projectMiddleware');
const { validateProject } = require('../middleware/validationMiddleware');

const projectController = require('../controllers/projectController');

// Create project (Authenticated users)
router.post('/', verifyToken, validateProject, projectController.createProject);

// Get all projects
router.get('/', verifyToken, projectController.getProjects);

// Get single project
router.get('/:id', verifyToken, requireProjectMember, projectController.getProjectById);

// Soft delete project
router.delete('/:id', verifyToken, requireAdmin, projectController.deleteProject);

// Update project (Admin/Manager)
router.put('/:id', verifyToken, projectController.updateProject);

router.put('/:projectId/transfer/:newAdminId', verifyToken, requireAdmin, projectController.transferOwnership);

module.exports = router;

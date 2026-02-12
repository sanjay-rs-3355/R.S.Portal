const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/roleMiddleware');
const requireProjectMember = require('../middleware/projectMiddleware');
const requireTaskOwner = require('../middleware/taskMiddleware');

const taskController = require('../controllers/taskController');

// Create task
router.post('/projects/:id/tasks',
    verifyToken,
    requireAdmin,
    taskController.createTask
);

// Get tasks
router.get('/projects/:id/tasks',
    verifyToken,
    requireProjectMember,
    taskController.getTasks
);

// Update task status
router.put('/tasks/:id/status',
    verifyToken,
    requireTaskOwner,
    taskController.updateTaskStatus
);

// Update priority
router.put('/tasks/:id/priority',
    verifyToken,
    requireAdmin,
    taskController.updatePriority
);

// Delete task
router.delete('/tasks/:id',
    verifyToken,
    requireAdmin,
    taskController.deleteTask
);

module.exports = router;

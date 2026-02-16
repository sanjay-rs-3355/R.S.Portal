const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const { requireAdmin, requireManager, requireTester } = require('../middleware/roleMiddleware');
const requireProjectMember = require('../middleware/projectMiddleware');
const requireTaskOwner = require('../middleware/taskMiddleware');

const taskController = require('../controllers/taskController');

// Create task (Admin, Manager, Tester)
router.post('/projects/:id/tasks',
    verifyToken,
    requireTester,
    taskController.createTask
);

// Get tasks
router.get('/projects/:id/tasks',
    verifyToken,
    requireProjectMember,
    taskController.getTasks
);

// Update task status (Owner, Admin, Manager, Tester - handled by middleware)
router.put('/tasks/:id/status',
    verifyToken,
    requireTaskOwner,
    taskController.updateTaskStatus
);

// Update priority (Admin, Manager)
router.put('/tasks/:id/priority',
    verifyToken,
    requireManager,
    taskController.updatePriority
);

// Assign task (Admin, Manager)
router.put('/tasks/:id/assign',
    verifyToken,
    requireManager,
    taskController.assignTask
);

// Delete task (Admin, Manager)
router.delete('/tasks/:id',
    verifyToken,
    requireManager,
    taskController.deleteTask
);

module.exports = router;

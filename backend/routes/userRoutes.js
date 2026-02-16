const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware'); // Might need to check if this exists, but file content shows it.
const userController = require('../controllers/userController');

// Get all users (Admin only)
router.get('/', verifyToken, requireAdmin, userController.getAllUsers);

router.put('/:id/suspend', verifyToken, requireAdmin, userController.suspendUser);
router.put('/:id/activate', verifyToken, requireAdmin, userController.activateUser);
router.put('/:id/promote', verifyToken, requireAdmin, userController.promoteUser);
router.put('/:id/demote', verifyToken, requireAdmin, userController.demoteUser);
router.delete('/:id', verifyToken, requireAdmin, userController.deleteUser);

module.exports = router;

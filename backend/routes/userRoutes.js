const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/roleMiddleware');
const userController = require('../controllers/userController');

router.put('/users/:id/suspend', verifyToken, requireAdmin, userController.suspendUser);
router.put('/users/:id/activate', verifyToken, requireAdmin, userController.activateUser);
router.put('/users/:id/promote', verifyToken, requireAdmin, userController.promoteUser);
router.put('/users/:id/demote', verifyToken, requireAdmin, userController.demoteUser);
router.delete('/users/:id', verifyToken, requireAdmin, userController.deleteUser);

module.exports = router;

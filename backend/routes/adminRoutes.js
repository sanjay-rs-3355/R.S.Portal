const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Generic Database Manager Routes
router.get('/db/:tableName', verifyToken, requireAdmin, adminController.getTableData);
router.post('/db/:tableName', verifyToken, requireAdmin, adminController.createRecord);
router.put('/db/:tableName/:id', verifyToken, requireAdmin, adminController.updateRecord);
router.delete('/db/:tableName/:id', verifyToken, requireAdmin, adminController.deleteRecord);

module.exports = router;

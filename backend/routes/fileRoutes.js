const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const verifyToken = require('../middleware/authMiddleware');
const requireProjectMember = require('../middleware/projectMiddleware');
const fileController = require('../controllers/fileController');

// Multer Config
// Multer Config: Memory Storage for Ephemeral Reliability (Render Support)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post('/projects/:projectId/files', verifyToken, requireProjectMember, upload.single('file'), fileController.uploadFile);
router.get('/projects/:projectId/files', verifyToken, requireProjectMember, fileController.getFilesByProject);
router.get('/files/download/:id', verifyToken, fileController.downloadFile);
router.delete('/files/:id', verifyToken, fileController.deleteFile);

// File Comments
router.get('/files/:id/comments', verifyToken, fileController.getFileComments);
router.post('/files/:id/comments', verifyToken, fileController.addFileComment);

module.exports = router;

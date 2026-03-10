const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const verifyToken = require('../middleware/authMiddleware');
const requireProjectMember = require('../middleware/projectMiddleware');
const fileController = require('../controllers/fileController');

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/projects/:projectId/files', verifyToken, requireProjectMember, upload.single('file'), fileController.uploadFile);
router.get('/projects/:projectId/files', verifyToken, requireProjectMember, fileController.getFilesByProject);
router.get('/files/download/:id', verifyToken, fileController.downloadFile);
router.delete('/files/:id', verifyToken, fileController.deleteFile);

// File Comments
router.get('/files/:id/comments', verifyToken, fileController.getFileComments);
router.post('/files/:id/comments', verifyToken, fileController.addFileComment);

module.exports = router;

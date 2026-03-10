const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams needed to access projectId from parent route if mounted differently, but here we define full path

const verifyToken = require('../middleware/authMiddleware');
const requireProjectMember = require('../middleware/projectMiddleware');
const snippetController = require('../controllers/snippetController');

// Routes mounted at /api/projects/:projectId/snippets & /api/snippets
router.post('/projects/:projectId/snippets', verifyToken, requireProjectMember, snippetController.createSnippet);
router.get('/projects/:projectId/snippets', verifyToken, requireProjectMember, snippetController.getSnippetsByProject);
router.put('/snippets/:id', verifyToken, snippetController.updateSnippet);
router.delete('/snippets/:id', verifyToken, snippetController.deleteSnippet);

module.exports = router;

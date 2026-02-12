const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

/* ================= DASHBOARD SUMMARY ================= */
router.get('/', verifyToken, dashboardController.getDashboard);

/* ================= USER PROJECTS (OVERVIEW LIST) ================= */
router.get('/projects', verifyToken, dashboardController.getUserProjects);

/* ================= USER TEAMS ================= */
router.get('/teams', verifyToken, dashboardController.getUserTeams);

/* ================= UPCOMING DEADLINES ================= */
router.get('/deadlines', verifyToken, dashboardController.getUpcomingDeadlines);

module.exports = router;

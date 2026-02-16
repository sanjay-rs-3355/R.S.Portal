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

/* ================= USER TASKS ================= */
router.get('/tasks', verifyToken, dashboardController.getUserTasks);

/* ================= UPCOMING DEADLINES ================= */
router.get('/deadlines', verifyToken, dashboardController.getUpcomingDeadlines);

/* ================= RECENT ACTIVITY ================= */
router.get('/activity', verifyToken, dashboardController.getRecentActivity);

/* ================= PERFORMANCE STATS ================= */
router.get('/performance', verifyToken, dashboardController.getPerformanceStats);

/* ================= USER GROWTH (ADMIN) ================= */
router.get('/user-growth', verifyToken, dashboardController.getUserGrowth);

module.exports = router;

const db = require('../config/db');

const getDashboard = async (req, res, next) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {

        // Fetch user details for name display
        const [[user]] = await db.execute('SELECT name FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const userName = user.name;

        if (role === 'admin') {
            const [[stats]] = await db.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM users) AS totalUsers,
                    (SELECT COUNT(*) FROM projects WHERE is_deleted = FALSE) AS totalProjects,
                    COUNT(*) AS totalTasks,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedTasks,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingTasks,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgressTasks,
                    SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) AS reviewTasks,
                    SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS highPriorityTasks,
                    SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) AS mediumPriorityTasks,
                    SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) AS lowPriorityTasks,
                    SUM(CASE WHEN deadline < CURDATE() AND status != 'completed' THEN 1 ELSE 0 END) AS overdueTasks
                FROM tasks t
                JOIN projects p ON t.project_id = p.id
                WHERE p.is_deleted = FALSE
            `);

            return res.json({
                role: 'admin',
                name: userName,
                totalUsers: Number(stats.totalUsers || 0),
                totalProjects: Number(stats.totalProjects || 0),
                totalTasks: Number(stats.totalTasks || 0),
                completedTasks: Number(stats.completedTasks || 0),
                pendingTasks: Number(stats.pendingTasks || 0),
                inProgressTasks: Number(stats.inProgressTasks || 0),
                reviewTasks: Number(stats.reviewTasks || 0),
                highPriorityTasks: Number(stats.highPriorityTasks || 0),
                mediumPriorityTasks: Number(stats.mediumPriorityTasks || 0),
                lowPriorityTasks: Number(stats.lowPriorityTasks || 0),
                overdueTasks: Number(stats.overdueTasks || 0)
            });

        } else {
            const [[stats]] = await db.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM project_members WHERE user_id = ?) AS joinedProjects,
                    COUNT(*) AS totalAssigned,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedTasks,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingTasks,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgressTasks,
                    SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) AS reviewTasks,
                    SUM(CASE WHEN deadline < CURDATE() AND status != 'completed' THEN 1 ELSE 0 END) AS overdueTasks
                FROM tasks t
                JOIN projects p ON t.project_id = p.id
                WHERE t.assigned_to = ? AND p.is_deleted = FALSE
            `, [userId, userId]);

            const { totalAssigned, completedTasks, pendingTasks, inProgressTasks, reviewTasks } = stats;
            let progress = [0, 0, 0, 0];
            if (totalAssigned > 0) {
                progress = [
                    Math.round((completedTasks / totalAssigned) * 100),
                    Math.round((pendingTasks / totalAssigned) * 100),
                    Math.round((inProgressTasks / totalAssigned) * 100),
                    Math.round((reviewTasks / totalAssigned) * 100)
                ];
            }

            return res.json({
                role: 'member',
                name: userName,
                joinedProjects: Number(stats.joinedProjects || 0),
                assignedTasks: Number(totalAssigned || 0),
                completedTasks: Number(completedTasks || 0),
                pendingTasks: Number(pendingTasks || 0),
                inProgressTasks: Number(inProgressTasks || 0),
                reviewTasks: Number(reviewTasks || 0),
                overdueTasks: Number(stats.overdueTasks || 0),
                totalUsers: Number(stats.joinedProjects || 0), // team members count (project-based)
                progress: progress.map(p => Number(p || 0))
            });
        }

    } catch (error) {
        next(error);
    }
};

const getUserProjects = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let query;
        let params;

        if (role === 'admin') {
            query = `
                SELECT p.*, 
                    COUNT(t.id) as total_tasks,
                    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
                FROM projects p
                LEFT JOIN tasks t ON p.id = t.project_id
                WHERE p.is_deleted = FALSE
                GROUP BY p.id
                ORDER BY p.last_activity_at DESC
            `;
            params = [];
        } else {
            query = `
                SELECT p.*, 
                    COUNT(t.id) as total_tasks,
                    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
                FROM projects p
                JOIN project_members pm ON p.id = pm.project_id
                LEFT JOIN tasks t ON p.id = t.project_id
                WHERE pm.user_id = ? AND p.is_deleted = FALSE
                GROUP BY p.id
                ORDER BY p.last_activity_at DESC
            `;
            params = [userId];
        }

        const [projects] = await db.execute(query, params);

        // Calculate progress percentage
        const projectsWithProgress = projects.map(p => ({
            ...p,
            progress: p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0
        }));

        res.json(projectsWithProgress);
    } catch (error) {
        next(error);
    }
};

const getUserTeams = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [projects] = await db.execute(`
            SELECT p.id, p.title 
            FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = ? AND p.is_deleted = FALSE
        `, [userId]);

        const teams = [];

        for (const project of projects) {
            const [members] = await db.execute(`
                SELECT u.id, u.name, u.email, u.profile_image 
                FROM users u
                JOIN project_members pm ON u.id = pm.user_id
                WHERE pm.project_id = ?
            `, [project.id]);

            teams.push({
                projectId: project.id,
                projectTitle: project.title,
                members
            });
        }

        res.json(teams);
    } catch (error) {
        next(error);
    }
};

const getUpcomingDeadlines = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const projectId = req.query.projectId; // Optional filter

        // Admins see all upcoming deadlines; members only see their own
        let query;
        let params = [];
        if (role === 'admin') {
            query = `
                SELECT t.id, t.title, t.deadline, t.priority, p.title as projectTitle, u.name as assignedToName
                FROM tasks t
                JOIN projects p ON t.project_id = p.id
                LEFT JOIN users u ON t.assigned_to = u.id
                WHERE t.status != 'completed'
                AND t.deadline IS NOT NULL
                AND t.deadline >= CURDATE()
                ${projectId ? 'AND t.project_id = ?' : ''}
                ORDER BY t.deadline ASC
                LIMIT 100
            `;
            if (projectId) params.push(projectId);
        } else {
            if (projectId) {
                query = `
                    SELECT t.id, t.title, t.deadline, t.priority, p.title as projectTitle, u.name as assignedToName
                    FROM tasks t
                    JOIN projects p ON t.project_id = p.id
                    LEFT JOIN users u ON t.assigned_to = u.id
                    WHERE t.assigned_to = ? AND t.project_id = ?
                    AND t.status != 'completed'
                    AND t.deadline IS NOT NULL
                    AND t.deadline >= CURDATE()
                    ORDER BY t.deadline ASC
                    LIMIT 100
                `;
                params = [userId, projectId];
            } else {
                query = `
                    SELECT t.id, t.title, t.deadline, t.priority, p.title as projectTitle, u.name as assignedToName
                    FROM tasks t
                    JOIN projects p ON t.project_id = p.id
                    LEFT JOIN users u ON t.assigned_to = u.id
                    WHERE t.assigned_to = ?
                    AND t.status != 'completed'
                    AND t.deadline IS NOT NULL
                    AND t.deadline >= CURDATE()
                    ORDER BY t.deadline ASC
                    LIMIT 100
                `;
                params = [userId];
            }
        }

        const [tasks] = await db.execute(query, params);

        const formatted = tasks.map(t => {
            // Use midnight UTC for both dates to get clean day difference
            const deadline = new Date(t.deadline);
            deadline.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const diffMs = deadline - today;
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            let remaining;
            if (diffDays === 0) remaining = 'Due Today';
            else if (diffDays === 1) remaining = 'Tomorrow';
            else if (diffDays < 0) remaining = `${Math.abs(diffDays)}d overdue`;
            else remaining = `${diffDays} days left`;

            const dateStr = deadline.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });

            return {
                ...t,
                remaining,
                dateStr,
                diffDays
            };
        });

        res.json(formatted);
    } catch (error) {
        next(error);
    }
};

const getUserTasks = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [tasks] = await db.execute(`
            SELECT t.id, t.title, t.status, t.priority, t.deadline, p.title as projectTitle
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.assigned_to = ?
                ORDER BY t.deadline ASC
                    `, [userId]);

        res.json(tasks);
    } catch (error) {
        next(error);
    }
};


const getRecentActivity = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let query;
        let params;

        if (role === 'admin') {
            query = `
                SELECT al.id, al.action, al.created_at, p.title as projectTitle, u.name as userName
                FROM activity_logs al
                LEFT JOIN projects p ON al.project_id = p.id
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT 100
                `;
            params = [];
        } else {
            query = `
                SELECT al.id, al.action, al.created_at, p.title as projectTitle, u.name as userName
                FROM activity_logs al
                LEFT JOIN projects p ON al.project_id = p.id
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.user_id = ?
                OR al.project_id IN(SELECT project_id FROM project_members WHERE user_id = ?)
                ORDER BY al.created_at DESC
                LIMIT 100
                `;
            params = [userId, userId];
        }

        const [activities] = await db.execute(query, params);
        res.json(activities);
    } catch (error) {
        next(error);
    }
};

const getPerformanceStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        // Group by month for the last 6 months
        const isMember = role !== 'admin';

        // Query Conditions
        const userCondition = isMember ? 'AND assigned_to = ?' : '';
        const params = isMember ? [userId] : [];

        // Completed Tasks Query
        const [completedStats] = await db.execute(`
            SELECT
            DATE_FORMAT(updated_at, '%Y-%m') as key_month,
                DATE_FORMAT(updated_at, '%b %Y') as month,
                COUNT(*) as count
            FROM tasks 
            WHERE status = 'completed'
              AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
              ${userCondition}
            GROUP BY key_month, month
            ORDER BY key_month ASC
                `, params);

        // Total Tasks Created (for Admin) or Assigned (for Member) Query
        const dateColumn = isMember ? 'created_at' : 'created_at'; // Both use created_at for trend

        // For Admin: System-wide task creation trend
        // For Member: Personal assignment trend (using created_at as proxy for when task entered system, or assigned_to check)
        // If we want "Tasks Assigned To User", we check created_at of task where assigned_to = user.

        const [totalStats] = await db.execute(`
            SELECT
            DATE_FORMAT(created_at, '%Y-%m') as key_month,
                DATE_FORMAT(created_at, '%b %Y') as month,
                COUNT(*) as count
            FROM tasks 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
              ${userCondition}
            GROUP BY key_month, month
            ORDER BY key_month ASC
                `, params);

        // Merge and Format
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toISOString().slice(0, 7); // YYYY-MM
            const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
            months.push({ key, label });
        }

        const labels = months.map(m => m.label);
        const completedData = months.map(m => {
            const found = completedStats.find(s => s.key_month === m.key);
            return found ? found.count : 0;
        });
        const totalData = months.map(m => {
            const found = totalStats.find(s => s.key_month === m.key);
            return found ? found.count : 0;
        });

        res.json({ labels, completedData, createdData: totalData });

    } catch (error) {
        next(error);
    }
};

const getUserGrowth = async (req, res, next) => {
    try {
        // Admin Only
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const [stats] = await db.execute(`
            SELECT
            DATE_FORMAT(created_at, '%Y-%m') as key_month,
                DATE_FORMAT(created_at, '%b') as month,
                COUNT(*) as count
            FROM users 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY key_month, month
            ORDER BY key_month ASC
                `);

        // Fill gaps
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toISOString().slice(0, 7);
            const label = d.toLocaleString('default', { month: 'short' });
            months.push({ key, label });
        }

        const labels = months.map(m => m.label);
        const data = months.map(m => {
            const found = stats.find(s => s.key_month === m.key);
            return found ? found.count : 0;
        });

        res.json({ labels, data });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboard,
    getUserProjects,
    getUserTeams,
    getUpcomingDeadlines,
    getUserTasks,
    getRecentActivity,
    getPerformanceStats,
    getUserGrowth
};

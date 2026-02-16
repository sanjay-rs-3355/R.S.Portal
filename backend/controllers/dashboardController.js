const db = require('../config/db');

const getDashboard = async (req, res) => {
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

            const [[totalUsers]] = await db.execute(
                'SELECT COUNT(*) AS count FROM users'
            );

            const [[totalProjects]] = await db.execute(
                'SELECT COUNT(*) AS count FROM projects WHERE is_deleted = FALSE'
            );

            const [[totalTasks]] = await db.execute(
                'SELECT COUNT(*) AS count FROM tasks'
            );

            const [[completedTasks]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE status = 'completed'"
            );

            const [[pendingTasks]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE status = 'pending'"
            );

            const [[inProgressTasks]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE status = 'in_progress'"
            );

            const [[highPriority]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE priority = 'high'"
            );

            const [[mediumPriority]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE priority = 'medium'"
            );

            const [[lowPriority]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE priority = 'low'"
            );

            const [[overdueTasks]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE deadline < CURDATE() AND status != 'completed'"
            );

            return res.json({
                role: 'admin',
                name: userName,
                totalUsers: totalUsers.count,
                totalProjects: totalProjects.count,
                totalTasks: totalTasks.count,
                completedTasks: completedTasks.count,
                pendingTasks: pendingTasks.count,
                inProgressTasks: inProgressTasks.count,
                highPriorityTasks: highPriority.count,
                mediumPriorityTasks: mediumPriority.count,
                lowPriorityTasks: lowPriority.count,
                overdueTasks: overdueTasks.count
            });

        } else {

            const [[joinedProjects]] = await db.execute(
                'SELECT COUNT(*) AS count FROM project_members WHERE user_id = ?',
                [userId]
            );

            const [[assignedTasks]] = await db.execute(
                'SELECT COUNT(*) AS count FROM tasks WHERE assigned_to = ?',
                [userId]
            );

            const [[completedTasks]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE assigned_to = ? AND status = 'completed'",
                [userId]
            );

            const [[pendingTasks]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE assigned_to = ? AND status = 'pending'",
                [userId]
            );

            const [[inProgressTasks]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE assigned_to = ? AND status = 'in_progress'",
                [userId]
            );

            const [[overdueTasks]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE assigned_to = ? AND deadline < CURDATE() AND status != 'completed'",
                [userId]
            );

            const totalAssigned = assignedTasks.count;
            const completed = completedTasks.count;
            const pending = pendingTasks.count;
            const inProgress = inProgressTasks.count;

            let progress = [0, 0, 0];
            if (totalAssigned > 0) {
                progress = [
                    Math.round((completed / totalAssigned) * 100),
                    Math.round((pending / totalAssigned) * 100),
                    Math.round((inProgress / totalAssigned) * 100)
                ];
            }

            return res.json({
                role: 'member',
                name: userName,
                joinedProjects: joinedProjects.count,
                assignedTasks: assignedTasks.count,
                completedTasks: completedTasks.count,
                pendingTasks: pendingTasks.count,
                inProgressTasks: inProgressTasks.count,
                overdueTasks: overdueTasks.count,
                progress // [Completed %, Pending %, In Progress %]
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getUserProjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let query;
        let params;

        if (role === 'admin') {
            // Admin sees ALL projects with progress
            query = `
                SELECT p.*, 
                (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
                (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_tasks
                FROM projects p
                WHERE p.is_deleted = FALSE
            `;
            params = [];
        } else {
            // Regular user only sees joined projects
            query = `
                SELECT p.*, 
                (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
                (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_tasks
                FROM projects p
                JOIN project_members pm ON p.id = pm.project_id
                WHERE pm.user_id = ? AND p.is_deleted = FALSE
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
        console.error("getUserProjects error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getUserTeams = async (req, res) => {
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
        console.error("getUserTeams error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getUpcomingDeadlines = async (req, res) => {
    try {
        const userId = req.user.id;

        const [tasks] = await db.execute(`
            SELECT t.id, t.title, t.deadline, p.title as projectTitle
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.assigned_to = ? 
            AND t.status != 'completed' 
            AND t.deadline IS NOT NULL
            AND t.deadline >= CURDATE()
            ORDER BY t.deadline ASC
            LIMIT 5
        `, [userId]);

        const formatted = tasks.map(t => {
            const date = new Date(t.deadline);
            const today = new Date();
            const diffTime = Math.abs(date - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let remaining = "";
            if (diffDays === 0) remaining = "Today";
            else if (diffDays === 1) remaining = "Tomorrow";
            else remaining = `${diffDays} Days`;

            return {
                ...t,
                remaining
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error("getUpcomingDeadlines error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getUserTasks = async (req, res) => {
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
        console.error("getUserTasks error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


const getRecentActivity = async (req, res) => {
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
                LIMIT 10
            `;
            params = [];
        } else {
            query = `
                SELECT al.id, al.action, al.created_at, p.title as projectTitle, u.name as userName
                FROM activity_logs al
                LEFT JOIN projects p ON al.project_id = p.id
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.user_id = ? 
                   OR al.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)
                ORDER BY al.created_at DESC
                LIMIT 10
            `;
            params = [userId, userId];
        }

        const [activities] = await db.execute(query, params);
        res.json(activities);
    } catch (error) {
        console.error("getRecentActivity error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getPerformanceStats = async (req, res) => {
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

        res.json({ labels, completedData, totalData });

    } catch (error) {
        console.error("getPerformanceStats error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getUserGrowth = async (req, res) => {
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
        console.error("getUserGrowth error:", error);
        res.status(500).json({ message: "Server error" });
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

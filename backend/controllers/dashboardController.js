const db = require('../config/db');

const getDashboard = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {

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

            const [[highPriority]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE priority = 'high'"
            );

            const [[overdueTasks]] = await db.execute(
                "SELECT COUNT(*) AS count FROM tasks WHERE deadline < CURDATE() AND status != 'completed'"
            );

            return res.json({
                role: 'admin',
                totalUsers: totalUsers.count,
                totalProjects: totalProjects.count,
                totalTasks: totalTasks.count,
                completedTasks: completedTasks.count,
                pendingTasks: pendingTasks.count,
                highPriorityTasks: highPriority.count,
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

        // Get projects where user is a member OR created the project
        // Note: project_members usually handles membership. If creator isn't in members, we might need OR created_by = ?
        // Assuming creators are added to project_members on creation, but let's be safe.
        // Simplified query: Join projects and members.

        const [projects] = await db.execute(`
            SELECT p.*, 
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_tasks
            FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = ? AND p.is_deleted = FALSE
            GROUP BY p.id
        `, [userId]);

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

        // Get projects user is in
        const [projects] = await db.execute(`
            SELECT p.id, p.title 
            FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = ? AND p.is_deleted = FALSE
        `, [userId]);

        const teams = [];

        for (const project of projects) {
            // Get members for each project
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

        // Get tasks assigned to user OR in user's projects (depending on requirement)
        // Usually "My Deadlines" implies assigned to me.
        // Let's go with assigned tasks + project deadlines if not assigned? 
        // Safer: tasks assigned to user that are not completed.

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

module.exports = {
    getDashboard,
    getUserProjects,
    getUserTeams,
    getUpcomingDeadlines
};

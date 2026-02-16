require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcrypt');

const seed = async () => {
    try {
        console.log("🌱 Starting seed...");

        // 1. Create Users
        console.log("Creating Users...");
        const password = await bcrypt.hash('123456', 10);
        const users = [
            { name: 'Alice Admin', email: 'admin@test.com', role: 'admin' },
            { name: 'Bob Manager', email: 'manager@test.com', role: 'manager' },
            { name: 'Charlie Tester', email: 'tester@test.com', role: 'tester' },
            { name: 'Dave Developer', email: 'dev@test.com', role: 'member' },
            { name: 'Eve Designer', email: 'designer@test.com', role: 'member' }
        ];

        const userIds = {};

        for (const u of users) {
            // Check if exists
            const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [u.email]);
            if (rows.length > 0) {
                userIds[u.role] = rows[0].id; // Just store the last one of that role
                if (!userIds[u.email]) userIds[u.email] = rows[0].id;
                console.log(`User ${u.email} already exists.`);
            } else {
                const [result] = await db.execute(
                    'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
                    [u.name, u.email, password, u.role, 'active']
                );
                userIds[u.role] = result.insertId;
                userIds[u.email] = result.insertId;
                console.log(`Created user ${u.email}`);
            }
        }

        // 2. Create Projects
        console.log("Creating Projects...");
        const projects = [
            { title: 'Alpha Website Redesign', description: 'Overhaul of the main corporate website.' },
            { title: 'Beta Mobile App', description: 'Native functionalities for iOS and Android.' },
            { title: 'Gamma Marketing Q3', description: 'Social media and ad campaigns.' }
        ];

        const projectIds = [];

        for (const p of projects) {
            const [rows] = await db.execute('SELECT id FROM projects WHERE title = ?', [p.title]);
            if (rows.length > 0) {
                projectIds.push(rows[0].id);
                console.log(`Project ${p.title} already exists.`);
            } else {
                const [result] = await db.execute(
                    'INSERT INTO projects (title, description, created_by) VALUES (?, ?, ?)',
                    [p.title, p.description, userIds['admin']]
                );
                projectIds.push(result.insertId);
                console.log(`Created project ${p.title}`);
            }
        }

        // 3. Assign Members to Projects (Randomly)
        console.log("Assigning Members...");
        const allUserIds = Object.values(userIds);
        for (const projectId of projectIds) {
            for (const userId of allUserIds) {
                try {
                    await db.execute(
                        'INSERT INTO project_members (project_id, user_id) VALUES (?, ?)',
                        [projectId, userId]
                    );
                } catch (e) {
                    if (e.code !== 'ER_DUP_ENTRY') console.error(e.message);
                }
            }
        }

        // 4. Create Tasks
        console.log("Creating Tasks...");
        const tasks = [
            { title: 'Design Homepage', status: 'completed', priority: 'high' },
            { title: 'Setup Database', status: 'completed', priority: 'high' },
            { title: 'Create API Endpoints', status: 'in_progress', priority: 'high' },
            { title: 'Frontend Integration', status: 'in_progress', priority: 'medium' },
            { title: 'Unit Testing', status: 'pending', priority: 'medium' },
            { title: 'User Acceptance Testing', status: 'pending', priority: 'low' },
            { title: 'Fix Navigation Bug', status: 'pending', priority: 'high' },
            { title: 'Optimize Queries', status: 'completed', priority: 'medium' },
            { title: 'Security Audit', status: 'completed', priority: 'high' }
        ];

        for (const projectId of projectIds) {
            for (const t of tasks) {
                const assignee = allUserIds[Math.floor(Math.random() * allUserIds.length)];

                // Random date in last 6 months
                const date = new Date();
                date.setMonth(date.getMonth() - Math.floor(Math.random() * 6));
                date.setDate(Math.floor(Math.random() * 28) + 1);

                const created_at = date.toISOString().slice(0, 19).replace('T', ' ');
                const updated_at = created_at;

                // Deadline is 1-30 days after creation
                const deadlineDate = new Date(date);
                deadlineDate.setDate(deadlineDate.getDate() + Math.floor(Math.random() * 30) + 1);
                const deadline = deadlineDate.toISOString().slice(0, 10);

                await db.execute(
                    `INSERT INTO tasks (project_id, title, description, assigned_to, priority, status, deadline, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [projectId, t.title, `Description for ${t.title}`, assignee, t.priority, t.status, deadline, created_at, updated_at]
                );
            }
        }
        console.log("Tasks created.");

        // ... messages ...

        // ... comments ...

        // ... notifications ...

        // ... attachments ...

        // ... invitations ...

        // 10. Create Activity Logs (Last 6 months)
        console.log("Creating Activity Logs...");
        const actions = [
            "User logged in",
            "Created a new project",
            "Updated task status",
            "Assigned a task",
            "Uploaded a file"
        ];

        for (let i = 0; i < 50; i++) {
            const userId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
            const projectId = projectIds[Math.floor(Math.random() * projectIds.length)];
            const action = actions[Math.floor(Math.random() * actions.length)];

            // Random date in last 6 months
            const date = new Date();
            date.setMonth(date.getMonth() - Math.floor(Math.random() * 6));
            date.setDate(Math.floor(Math.random() * 28) + 1);
            const created_at = date.toISOString().slice(0, 19).replace('T', ' ');

            await db.execute(
                'INSERT INTO activity_logs (user_id, project_id, action, created_at) VALUES (?, ?, ?, ?)',
                [userId, projectId, action, created_at]
            );
        }
        console.log("Activity logs created.");

        console.log("✅ Seed completed without errors.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
};

seed();

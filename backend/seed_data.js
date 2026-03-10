require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcrypt');

const seed = async () => {
    try {
        console.log("🌱 Starting seed...");

        // 0. Clear Database
        console.log("Clearing database...");
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        const tables = [
            'notifications', 'attachments', 'project_invitations', 'task_status_history',
            'task_comments', 'activity_logs', 'messages', 'tasks', 'project_members',
            'projects', 'users', 'meetings', 'meeting_participants'
        ];
        for (const table of tables) {
            try {
                await db.execute(`TRUNCATE TABLE ${table}`);
            } catch (e) {
                console.log(`Table ${table} may not exist, skipping...`);
            }
        }
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');

        // 1. Create Users
        console.log("Creating Users...");
        const password = await bcrypt.hash('123456', 10);

        const coreUsers = [
            { name: 'Sanjay Admin', email: 'admin@test.com', role: 'admin', designation: 'Manager' },
            { name: 'Bob Manager', email: 'manager@test.com', role: 'manager', designation: 'Project Manager' },
            { name: 'Charlie Tester', email: 'tester@test.com', role: 'tester', designation: 'Tester' },
            { name: 'Dave Developer', email: 'dev@test.com', role: 'member', designation: 'Full-Stack Developer' },
            { name: 'Eve Designer', email: 'designer@test.com', role: 'member', designation: 'Designer' },
            { name: 'Frank Frontend', email: 'frontend@test.com', role: 'member', designation: 'Frontend Developer' }
        ];

        const userIds = [];
        const adminIdMap = {};

        for (const u of coreUsers) {
            const [result] = await db.execute(
                'INSERT INTO users (name, email, password, role, status, designation) VALUES (?, ?, ?, ?, ?, ?)',
                [u.name, u.email, password, u.role, 'active', u.designation]
            );
            const id = result.insertId;
            userIds.push(id);
            if (u.role === 'admin') adminIdMap['admin'] = id;
        }

        // Generate more diverse users
        const roles = ['member', 'tester', 'manager'];
        const designationsByRole = {
            'member': ['Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'Designer', 'UI-Designer'],
            'tester': ['Tester', 'QA Engineer'],
            'manager': ['Manager', 'Project Manager', 'Team Lead']
        };
        const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'];

        for (let i = 1; i <= 60; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const name = `${firstName} ${lastName}`;
            const email = `user${i}@example.com`;
            const role = roles[Math.floor(Math.random() * roles.length)];
            const designation = designationsByRole[role][Math.floor(Math.random() * designationsByRole[role].length)];

            const [result] = await db.execute(
                'INSERT INTO users (name, email, password, role, status, designation) VALUES (?, ?, ?, ?, ?, ?)',
                [name, email, password, role, 'active', designation]
            );
            userIds.push(result.insertId);
        }
        console.log(`${userIds.length} users created.`);

        // 2. Create Projects
        console.log("Creating Projects...");
        const projectData = [
            { title: 'Alpha Website Redesign', description: 'Overhaul of the main corporate website.' },
            { title: 'Beta Mobile App', description: 'Native functionalities for iOS and Android.' },
            { title: 'Gamma Marketing Q3', description: 'Social media and ad campaigns.' },
            { title: 'Delta API Integration', description: 'Integrating third-party services.' },
            { title: 'Epsilon AI Portal', description: 'AI-driven analytics and dashboard.' }
        ];

        const projectIds = [];
        for (const p of projectData) {
            const [result] = await db.execute(
                'INSERT INTO projects (title, description, created_by) VALUES (?, ?, ?)',
                [p.title, p.description, adminIdMap['admin']]
            );
            projectIds.push(result.insertId);
        }

        // 3. Assign EVERY User to EVERY Project (so everyone sees everything)
        console.log("Assigning all users to all projects...");
        for (const projectId of projectIds) {
            for (const userId of userIds) {
                await db.execute(
                    'INSERT IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)',
                    [projectId, userId]
                );
            }
        }

        // 4. Create Tasks - Ensuring EVERY USER HAS AT LEAST ONE TASK
        console.log("Creating Tasks...");
        const taskTemplates = [
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

        let taskCounter = 0;
        const today = new Date();

        // Direct assignment to ensure every user has a task
        for (const userId of userIds) {
            const projectId = projectIds[taskCounter % projectIds.length];
            const template = taskTemplates[taskCounter % taskTemplates.length];

            const createdDate = new Date();
            createdDate.setMonth(createdDate.getMonth() - Math.floor(Math.random() * 3));
            const created_at = createdDate.toISOString().slice(0, 19).replace('T', ' ');

            let deadlineDate = new Date(today);
            deadlineDate.setDate(today.getDate() + (taskCounter % 20) + 5);
            const deadline = deadlineDate.toISOString().slice(0, 10);

            await db.execute(
                `INSERT INTO tasks (project_id, title, description, assigned_to, priority, status, deadline, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [projectId, template.title + " for User", "Work on: " + template.title, userId, template.priority, template.status, deadline, created_at, created_at]
            );
            taskCounter++;
        }

        // Add some more random tasks
        for (let i = 0; i < 40; i++) {
            const projectId = projectIds[Math.floor(Math.random() * projectIds.length)];
            const template = taskTemplates[Math.floor(Math.random() * taskTemplates.length)];
            const userId = userIds[Math.floor(Math.random() * userIds.length)];

            const createdDate = new Date();
            createdDate.setMonth(createdDate.getMonth() - Math.floor(Math.random() * 2));
            const created_at = createdDate.toISOString().slice(0, 19).replace('T', ' ');

            let deadlineDate = new Date(today);
            deadlineDate.setDate(today.getDate() + Math.floor(Math.random() * 30));
            const deadline = deadlineDate.toISOString().slice(0, 10);

            await db.execute(
                `INSERT INTO tasks (project_id, title, description, assigned_to, priority, status, deadline, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [projectId, template.title, "Additional task: " + template.title, userId, template.priority, template.status, deadline, created_at, created_at]
            );
        }
        console.log("Tasks created for every user.");

        // 5. Create Meetings
        console.log("Creating Meetings...");
        const meetingDaysInFuture = [1, 2, 4, 7, 10, 14];
        const meetingTitles = [
            'Project Sync', 'Design Review', 'Technical Architecture',
            'Sprint Planning', 'Client Demo', 'Daily Standup'
        ];

        for (let i = 0; i < 15; i++) {
            const projectId = projectIds[Math.floor(Math.random() * projectIds.length)];
            const title = meetingTitles[Math.floor(Math.random() * meetingTitles.length)];
            const daysFuture = meetingDaysInFuture[Math.floor(Math.random() * meetingDaysInFuture.length)];

            const mDate = new Date(today);
            mDate.setDate(today.getDate() + daysFuture);
            const meetingDate = mDate.toISOString().slice(0, 10);
            const meetingTime = "10:00:00";

            const [result] = await db.execute(
                'INSERT INTO meetings (project_id, title, description, meeting_date, meeting_time, meeting_type, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [projectId, title, `Discussion about ${title} for the project.`, meetingDate, meetingTime, 'online', adminIdMap['admin']]
            );

            const meetingId = result.insertId;

            // Assign some participants (random sample of users)
            const participantCount = 5 + Math.floor(Math.random() * 10);
            const shuffled = [...userIds].sort(() => 0.5 - Math.random());
            const participants = shuffled.slice(0, participantCount);

            for (const pId of participants) {
                await db.execute(
                    'INSERT IGNORE INTO meeting_participants (meeting_id, user_id) VALUES (?, ?)',
                    [meetingId, pId]
                );
            }
        }
        console.log("Meetings scheduled.");

        // 6. Activity Logs
        console.log("Creating Activity Logs...");
        const actions = ["User logged in", "Updated task status", "Scheduled meeting", "Created task", "Posted message"];
        for (let i = 0; i < 100; i++) {
            const userId = userIds[Math.floor(Math.random() * userIds.length)];
            const projectId = projectIds[Math.floor(Math.random() * projectIds.length)];
            const action = actions[Math.floor(Math.random() * actions.length)];

            const date = new Date();
            date.setHours(date.getHours() - Math.floor(Math.random() * 48));
            const created_at = date.toISOString().slice(0, 19).replace('T', ' ');

            await db.execute(
                'INSERT INTO activity_logs (user_id, project_id, action, created_at) VALUES (?, ?, ?, ?)',
                [userId, projectId, action, created_at]
            );
        }

        console.log("✅ Seed completed without errors.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
};

seed();

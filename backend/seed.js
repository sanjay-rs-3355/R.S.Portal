const bcrypt = require('bcrypt');
const db = require('./config/db');

const NAMED_USERS = [
    { name: 'Sanjay R S',   email: 'sanjay@gmail.com',   role: 'admin',  designation: 'Project Lead' },
    { name: 'Thilak K',     email: 'thilak@gmail.com',   role: 'admin',  designation: 'Tech Lead' },
    { name: 'Sukesh M',     email: 'sukesh@gmail.com',   role: 'member', designation: 'Full Stack Developer' },
    { name: 'Ahill P',      email: 'ahill@gmail.com',    role: 'member', designation: 'Frontend Developer' },
    { name: 'Mohan R',      email: 'mohan@gmail.com',    role: 'member', designation: 'Backend Developer' },
    { name: 'Naresh V',     email: 'naresh@gmail.com',   role: 'member', designation: 'UI/UX Designer' },
];

const EXTRA_USERS = [
    { name: 'Priya S',       designation: 'QA Engineer' },
    { name: 'Arjun T',       designation: 'DevOps Engineer' },
    { name: 'Kavitha R',     designation: 'Data Scientist' },
    { name: 'Ravi M',        designation: 'Mobile Developer' },
    { name: 'Deepa K',       designation: 'Product Manager' },
    { name: 'Vikram P',      designation: 'Database Admin' },
    { name: 'Anitha G',      designation: 'Business Analyst' },
    { name: 'Karthik N',     designation: 'Cloud Architect' },
    { name: 'Ramya L',       designation: 'Security Engineer' },
    { name: 'Suresh B',      designation: 'Full Stack Developer' },
    { name: 'Nithya C',      designation: 'Frontend Developer' },
    { name: 'Ganesh D',      designation: 'Backend Developer' },
    { name: 'Meena E',       designation: 'UI/UX Designer' },
    { name: 'Balaji F',      designation: 'QA Engineer' },
    { name: 'Saranya H',     designation: 'DevOps Engineer' },
    { name: 'Dinesh I',      designation: 'Data Scientist' },
    { name: 'Lavanya J',     designation: 'Mobile Developer' },
    { name: 'Manoj K',       designation: 'Project Lead' },
    { name: 'Pooja L',       designation: 'Tech Lead' },
    { name: 'Rajesh M',      designation: 'Database Admin' },
    { name: 'Swetha N',      designation: 'Business Analyst' },
    { name: 'Venkat O',      designation: 'Cloud Architect' },
    { name: 'Geetha P',      designation: 'Security Engineer' },
    { name: 'Prasad Q',      designation: 'Full Stack Developer' },
    { name: 'Hema R',        designation: 'Frontend Developer' },
    { name: 'Senthil S',     designation: 'Backend Developer' },
    { name: 'Vimala T',      designation: 'UI/UX Designer' },
    { name: 'Arun U',        designation: 'QA Engineer' },
    { name: 'Nalini V',      designation: 'DevOps Engineer' },
    { name: 'Balachander W', designation: 'Data Scientist' },
    { name: 'Revathi X',     designation: 'Mobile Developer' },
    { name: 'Muthu Y',       designation: 'Product Manager' },
    { name: 'Saraswathi Z',  designation: 'Database Admin' },
    { name: 'Selvam A',      designation: 'Business Analyst' },
    { name: 'Padmaja B',     designation: 'Cloud Architect' },
    { name: 'Ezhil C',       designation: 'Security Engineer' },
    { name: 'Janani D',      designation: 'Full Stack Developer' },
    { name: 'Muthuraman E',  designation: 'Frontend Developer' },
    { name: 'Bhuvana F',     designation: 'Backend Developer' },
    { name: 'Satheesh G',    designation: 'UI/UX Designer' },
    { name: 'Tamilarasi H',  designation: 'QA Engineer' },
    { name: 'Gokul I',       designation: 'DevOps Engineer' },
    { name: 'Abinaya J',     designation: 'Data Scientist' },
    { name: 'Vijayan K',     designation: 'Mobile Developer' },
    { name: 'Chitra L',      designation: 'Project Lead' },
    { name: 'Yuvaraj M',     designation: 'Tech Lead' },
    { name: 'Malathi N',     designation: 'Database Admin' },
    { name: 'Sundar O',      designation: 'Business Analyst' },
    { name: 'Devika P',      designation: 'Cloud Architect' },
    { name: 'Soundar Q',     designation: 'Security Engineer' },
    { name: 'Indira R',      designation: 'Full Stack Developer' },
    { name: 'Palani S',      designation: 'Frontend Developer' },
    { name: 'Thenmozhi T',   designation: 'Backend Developer' },
    { name: 'Kumaran U',     designation: 'UI/UX Designer' },
    { name: 'Vasantha V',    designation: 'QA Engineer' },
    { name: 'Chandran W',    designation: 'DevOps Engineer' },
    { name: 'Nirmala X',     designation: 'Data Scientist' },
    { name: 'Parthiban Y',   designation: 'Mobile Developer' },
    { name: 'Shanthi Z',     designation: 'Product Manager' },
    { name: 'Ilango A',      designation: 'Database Admin' },
    { name: 'Kamala B',      designation: 'Business Analyst' },
    { name: 'Durai C',       designation: 'Cloud Architect' },
    { name: 'Saroja D',      designation: 'Security Engineer' },
    { name: 'Murugan E',     designation: 'Full Stack Developer' },
    { name: 'Radha F',       designation: 'Frontend Developer' },
    { name: 'Prabhu G',      designation: 'Backend Developer' },
    { name: 'Vasuki H',      designation: 'UI/UX Designer' },
    { name: 'Chellapan I',   designation: 'QA Engineer' },
    { name: 'Meenakshi J',   designation: 'DevOps Engineer' },
    { name: 'Subramani K',   designation: 'Data Scientist' },
    { name: 'Tharani L',     designation: 'Mobile Developer' },
    { name: 'Venkatesan M',  designation: 'Project Lead' },
    { name: 'Kowsalya N',    designation: 'Tech Lead' },
    { name: 'Rangan O',      designation: 'Database Admin' },
    { name: 'Sumathi P',     designation: 'Business Analyst' },
    { name: 'Anandan Q',     designation: 'Cloud Architect' },
    { name: 'Valliammai R',  designation: 'Security Engineer' },
    { name: 'Pandian S',     designation: 'Full Stack Developer' },
    { name: 'Kamali T',      designation: 'Frontend Developer' },
    { name: 'Natarajan U',   designation: 'Backend Developer' },
    { name: 'Sathya V',      designation: 'UI/UX Designer' },
    { name: 'Ambiga W',      designation: 'QA Engineer' },
    { name: 'Jayavel X',     designation: 'DevOps Engineer' },
    { name: 'Brindha Y',     designation: 'Data Scientist' },
    { name: 'Sekar Z',       designation: 'Mobile Developer' },
    { name: 'Kalyani A',     designation: 'Product Manager' },
    { name: 'Maharajan B',   designation: 'Database Admin' },
    { name: 'Gomathi C',     designation: 'Business Analyst' },
    { name: 'Jayakumar D',   designation: 'Cloud Architect' },
    { name: 'Mythili E',     designation: 'Security Engineer' },
    { name: 'Elumalai F',    designation: 'Full Stack Developer' },
];

const PROJECTS = [
    { title: 'AI Chat Application',        description: 'Real-time AI-powered chat platform with NLP capabilities and smart suggestions.' },
    { title: 'E-Commerce Platform',        description: 'Full-featured online store with cart, payments, and inventory management.' },
    { title: 'Portfolio Website',           description: 'Personal portfolio showcasing projects, skills and achievements.' },
    { title: 'Data Analytics Dashboard',   description: 'Interactive dashboard for business intelligence and data visualization.' },
    { title: 'Mobile Banking App',          description: 'Secure mobile banking application with transfers, bills, and statements.' },
    { title: 'Social Media Platform',       description: 'Community-driven platform with posts, stories, and real-time messaging.' },
    { title: 'Task Management System',      description: 'Collaborative task tracker with sprints, boards, and team assignment.' },
    { title: 'Cloud Storage Solution',      description: 'Secure file storage system with real-time sync and sharing features.' },
    { title: 'Gaming Leaderboard',          description: 'Live leaderboard and tournament management system for online games.' },
    { title: 'HR Management System',        description: 'Complete HR suite: attendance, payroll, leave, and performance tracking.' },
];

const MESSAGES = [
    'Let\'s kick off the sprint planning for this week!',
    'I\'ve pushed the latest changes to the dev branch.',
    'Need a code review on the authentication module.',
    'Meeting scheduled for tomorrow at 10 AM.',
    'The API integration is complete, ready for testing.',
    'Found a bug in the payment flow, investigating now.',
    'UI mockups are ready for review in Figma.',
    'Database migration ran successfully on staging.',
    'Can someone help with the deployment script?',
    'Performance tests show a 30% improvement!',
    'The client approved the new design!',
    'Refactoring the old codebase this sprint.',
    'Adding unit tests for the user service.',
    'Firewall rules updated on the production server.',
    'New feature branch created: feature/notifications.',
];

const TASK_TITLES = [
    'Set up CI/CD pipeline',
    'Design database schema',
    'Implement user authentication',
    'Create REST API endpoints',
    'Build responsive UI components',
    'Write unit tests',
    'Configure Nginx reverse proxy',
    'Integrate payment gateway',
    'Optimize database queries',
    'Add real-time notifications',
    'Implement file upload feature',
    'Code review and documentation',
    'Security audit and fixes',
    'Deploy to production',
    'Set up monitoring and alerts',
];

const CODE_SNIPPETS = [
    {
        title: 'JWT Auth Middleware',
        filename: 'authMiddleware.js',
        language: 'javascript',
        description: 'Express middleware for JWT token verification',
        code: `const jwt = require('jsonwebtoken');\n\nconst authMiddleware = (req, res, next) => {\n  const token = req.headers.authorization?.split(' ')[1];\n  if (!token) return res.status(401).json({ error: 'No token provided' });\n  try {\n    req.user = jwt.verify(token, process.env.JWT_SECRET);\n    next();\n  } catch (err) {\n    res.status(401).json({ error: 'Invalid token' });\n  }\n};`
    },
    {
        title: 'MySQL Connection Pool',
        filename: 'db.js',
        language: 'javascript',
        description: 'Database connection pool configuration',
        code: `const mysql = require('mysql2/promise');\n\nconst pool = mysql.createPool({\n  host: process.env.DB_HOST,\n  user: process.env.DB_USER,\n  password: process.env.DB_PASSWORD,\n  database: process.env.DB_NAME,\n  ssl: { rejectUnauthorized: false },\n  waitForConnections: true,\n  connectionLimit: 10,\n});\n\nmodule.exports = pool;`
    },
    {
        title: 'Debounce Hook',
        filename: 'useDebounce.js',
        language: 'javascript',
        description: 'React custom hook for debouncing values',
        code: `import { useState, useEffect } from 'react';\n\nexport function useDebounce(value, delay) {\n  const [debouncedValue, setDebouncedValue] = useState(value);\n  useEffect(() => {\n    const handler = setTimeout(() => setDebouncedValue(value), delay);\n    return () => clearTimeout(handler);\n  }, [value, delay]);\n  return debouncedValue;\n}`
    },
    {
        title: 'Python API Client',
        filename: 'api_client.py',
        language: 'python',
        description: 'HTTP client wrapper with retry logic',
        code: `import requests\nfrom time import sleep\n\ndef fetch_with_retry(url, retries=3, delay=1):\n    for attempt in range(retries):\n        try:\n            response = requests.get(url, timeout=10)\n            response.raise_for_status()\n            return response.json()\n        except requests.RequestException as e:\n            if attempt < retries - 1:\n                sleep(delay * (attempt + 1))\n            else:\n                raise e`
    },
    {
        title: 'CSS Glass Card',
        filename: 'glass.css',
        language: 'css',
        description: 'Glassmorphism card effect',
        code: `.glass-card {\n  background: rgba(255, 255, 255, 0.1);\n  backdrop-filter: blur(20px);\n  -webkit-backdrop-filter: blur(20px);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  border-radius: 16px;\n  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);\n  padding: 2rem;\n}`
    },
];

const MEETING_TITLES = [
    'Sprint Planning Meeting',
    'Daily Standup',
    'Code Review Session',
    'Design Review',
    'Client Demo',
    'Retrospective',
    'Architecture Discussion',
    'Bug Triage',
    'Stakeholder Update',
    'Team Sync',
];

function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randStatus() {
    return rand(['pending', 'in_progress', 'completed']);
}
function randPriority() {
    return rand(['low', 'medium', 'high']);
}
function pastDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
}
function futureDate(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
}

async function seedDatabase() {
    console.log('\n🌱 Starting database seed...\n');

    try {
        // ─── 0. ENSURE COLUMNS EXIST (fix for older deployments) ─
        try {
            await db.query("ALTER TABLE users ADD COLUMN designation VARCHAR(100) DEFAULT 'Member'");
            console.log('   ✅ designation column added to users table.');
        } catch (e) {
            // Column already exists — that's fine
        }
        try {
            await db.query("ALTER TABLE projects ADD COLUMN last_activity_text VARCHAR(255) NULL");
            await db.query("ALTER TABLE projects ADD COLUMN last_activity_type ENUM('task','message','member','file','meeting','snippet','general') NULL");
            await db.query("ALTER TABLE projects ADD COLUMN last_activity_at TIMESTAMP NULL");
        } catch (e) {
            // Columns already exist — that's fine
        }

        const [existingUsers] = await db.query('SELECT COUNT(*) as count FROM users');
        if (existingUsers[0].count >= 50) {
            console.log('✅ Database already seeded. Skipping.');
            return;
        }

        const password = await bcrypt.hash('123456', 10);

        // ─── 1. INSERT USERS ──────────────────────────────────────
        console.log('👤 Inserting 100 users...');
        const userIds = [];
        const namedIds = {};

        for (const u of NAMED_USERS) {
            const [result] = await db.query(
                `INSERT INTO users (name, email, password, role, designation, status) VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE password = VALUES(password), designation = VALUES(designation), role = VALUES(role), id = LAST_INSERT_ID(id)`,
                [u.name, u.email, password, u.role, u.designation, 'active']
            );
            const id = result.insertId || result.info?.match(/id=(\d+)/)?.[1];
            // Fetch actual id in case of duplicate
            const [[row]] = await db.query('SELECT id FROM users WHERE email = ?', [u.email]);
            userIds.push(row.id);
            namedIds[u.email.split('@')[0]] = row.id;
        }

        for (let i = 0; i < EXTRA_USERS.length; i++) {
            const u = EXTRA_USERS[i];
            const emailName = u.name.toLowerCase().replace(/[^a-z]/g, '').substring(0,10);
            const email = `${emailName}${i + 10}@portal.com`;
            try {
                const [result] = await db.query(
                    'INSERT IGNORE INTO users (name, email, password, role, designation, status) VALUES (?, ?, ?, ?, ?, ?)',
                    [u.name, email, password, 'member', u.designation, 'active']
                );
                const [[row]] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
                userIds.push(row.id);
            } catch (e) { /* skip */ }
        }
        console.log(`   ✅ ${userIds.length} users inserted.`);

        // ─── 2. INSERT PROJECTS ───────────────────────────────────
        console.log('📁 Inserting projects...');
        const projectIds = [];
        const adminId = namedIds['sanjay'];
        const thilakId = namedIds['thilak'];

        for (let i = 0; i < PROJECTS.length; i++) {
            const p = PROJECTS[i];
            const createdBy = i % 2 === 0 ? adminId : thilakId;
            const [result] = await db.query(
                'INSERT INTO projects (title, description, created_by, is_deleted, last_activity_text, last_activity_type, last_activity_at) VALUES (?, ?, ?, 0, ?, ?, NOW())',
                [p.title, p.description, createdBy, 'Project initialization', 'task']
            );
            projectIds.push(result.insertId);
        }
        console.log(`   ✅ ${projectIds.length} projects inserted.`);

        // ─── 3. PROJECT MEMBERS ───────────────────────────────────
        console.log('👥 Assigning members to projects...');
        const memberSets = {};
        for (const pid of projectIds) {
            memberSets[pid] = new Set();
            const shuffled = [...userIds].sort(() => Math.random() - 0.5).slice(0, randInt(6, 12));
            for (const uid of shuffled) {
                try {
                    await db.query('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)', [pid, uid]);
                    memberSets[pid].add(uid);
                } catch (e) { /* ignore duplicates */ }
            }
            // Ensure creator is always a member
            const crId = projectIds.indexOf(pid) % 2 === 0 ? adminId : thilakId;
            try {
                await db.query('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)', [pid, crId]);
                memberSets[pid].add(crId);
            } catch (e) { }
        }
        console.log('   ✅ Project members assigned.');

        // ─── 4. TASKS ─────────────────────────────────────────────
        console.log('✅ Inserting tasks...');
        const taskIds = [];
        for (const pid of projectIds) {
            const members = [...memberSets[pid]];
            for (let i = 0; i < randInt(6, 10); i++) {
                const title = TASK_TITLES[i % TASK_TITLES.length] + (i > 13 ? ' ' + (i - 13) : '');
                const assignedTo = rand(members);
                const [res] = await db.query(
                    'INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [pid, title, 'Detailed work for: ' + title, assignedTo, randStatus(), randPriority(), futureDate(randInt(1, 30))]
                );
                taskIds.push(res.insertId);
            }
        }
        console.log(`   ✅ ${taskIds.length} tasks inserted.`);

        // ─── 5. TASK COMMENTS ─────────────────────────────────────
        console.log('💬 Inserting task comments...');
        for (const tid of taskIds.slice(0, 50)) {
            for (let c = 0; c < randInt(1, 4); c++) {
                await db.query(
                    'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
                    [tid, rand(userIds), rand(['Looks good!', 'Needs revision', 'On it!', 'Blocked on dependency', 'PR raised', 'Done!', 'Reviewed ✅'])]
                );
            }
        }
        console.log('   ✅ Task comments inserted.');

        // ─── 6. TASK STATUS HISTORY ───────────────────────────────
        console.log('📊 Inserting task status history...');
        for (const tid of taskIds.slice(0, 30)) {
            await db.query(
                'INSERT INTO task_status_history (task_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)',
                [tid, 'pending', 'in_progress', rand(userIds)]
            );
        }
        console.log('   ✅ Task status history inserted.');

        // ─── 7. MESSAGES ──────────────────────────────────────────
        console.log('📨 Inserting messages...');
        for (const pid of projectIds) {
            const members = [...memberSets[pid]];
            for (let m = 0; m < randInt(10, 20); m++) {
                await db.query(
                    'INSERT INTO messages (project_id, sender_id, message) VALUES (?, ?, ?)',
                    [pid, rand(members), rand(MESSAGES)]
                );
            }
        }
        console.log('   ✅ Messages inserted.');

        // ─── 8. MEETINGS ──────────────────────────────────────────
        console.log('📅 Inserting meetings...');
        const meetingIds = [];
        for (const pid of projectIds) {
            const members = [...memberSets[pid]];
            for (let m = 0; m < randInt(2, 4); m++) {
                const [res] = await db.query(
                    'INSERT INTO meetings (project_id, title, description, meeting_date, meeting_time, meeting_type, meeting_link, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [pid, rand(MEETING_TITLES), 'Agenda: Project update and task review', futureDate(randInt(1, 14)), '10:00:00', rand(['online', 'in-person', 'hybrid']), 'https://meet.google.com/abc-defg-hij', rand(members)]
                );
                meetingIds.push(res.insertId);
                // Add participants
                const participants = [...members].sort(() => Math.random() - 0.5).slice(0, randInt(3, 6));
                for (const uid of participants) {
                    try {
                        await db.query('INSERT INTO meeting_participants (meeting_id, user_id) VALUES (?, ?)', [res.insertId, uid]);
                    } catch (e) { }
                }
            }
        }
        console.log(`   ✅ ${meetingIds.length} meetings inserted.`);

        // ─── 9. CODE SNIPPETS ─────────────────────────────────────
        console.log('💻 Inserting code snippets...');
        for (let i = 0; i < CODE_SNIPPETS.length; i++) {
            const s = CODE_SNIPPETS[i];
            const pid = projectIds[i % projectIds.length];
            await db.query(
                'INSERT INTO code_snippets (project_id, user_id, title, filename, language, description, code) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [pid, rand(userIds), s.title, s.filename, s.language, s.description, s.code]
            );
        }
        console.log('   ✅ Code snippets inserted.');

        // ─── 10. ATTACHMENTS ──────────────────────────────────────
        console.log('📎 Inserting attachments...');
        const attachIds = [];
        const fileNames = [
            { name: 'System Architecture.pdf', type: 'application/pdf', desc: 'Overview of the microservices architecture.' },
            { name: 'UI Mockups V2.fig', type: 'image/png', desc: 'Latest high-fidelity designs for the dashboard.' },
            { name: 'API Specifications.html', type: 'text/html', desc: 'Auto-generated Swagger documentation.' },
            { name: 'Database Schema.png', type: 'image/png', desc: 'ER diagram for the collaboration portal.' },
            { name: 'Sprint Report.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', desc: 'Velocity and burndown charts for Sprint 4.' }
        ];

        for (const pid of projectIds) {
            for (let a = 0; a < randInt(2, 5); a++) {
                const fileData = rand(fileNames);
                const uploader = rand(Array.from(memberSets[pid]));
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const diskPath = uniqueSuffix + '-' + fileData.name.replace(/\s+/g, '_');

                const [res] = await db.query(
                    'INSERT INTO attachments (project_id, user_id, title, description, filename, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        pid, 
                        uploader, 
                        fileData.name, 
                        fileData.desc, 
                        fileData.name, 
                        diskPath, 
                        randInt(1024, 1048576 * 5), 
                        fileData.type
                    ]
                );
                attachIds.push(res.insertId);
            }
        }
        console.log('   ✅ Attachments inserted.');

        // ─── 11. ATTACHMENT COMMENTS ──────────────────────────────
        console.log('💬 Inserting attachment comments...');
        for (const aid of attachIds.slice(0, 30)) {
            const [[attachment]] = await db.query('SELECT project_id FROM attachments WHERE id = ?', [aid]);
            const members = Array.from(memberSets[attachment.project_id]);
            
            for (let c = 0; c < randInt(1, 4); c++) {
                await db.query(
                    'INSERT INTO attachment_comments (attachment_id, user_id, content) VALUES (?, ?, ?)',
                    [aid, rand(members), rand(['Looks good!', 'Please update the header section.', 'Approved ✅', 'Needs more detail in section 3.', 'Version 2 looks much better.'])]
                );
            }
        }
        console.log('   ✅ Attachment comments inserted.');

        // ─── 12. NOTIFICATIONS ────────────────────────────────────
        console.log('🔔 Inserting notifications...');
        const notifMessages = [
            'You have been added to a new project',
            'A task has been assigned to you',
            'New message in your project',
            'Meeting scheduled for tomorrow',
            'Your task status was updated',
            'New file uploaded to your project',
            'Code review requested',
            'Project deadline approaching',
        ];
        for (const uid of userIds.slice(0, 30)) {
            for (let n = 0; n < randInt(3, 8); n++) {
                await db.query(
                    'INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, ?)',
                    [uid, rand(notifMessages), randInt(0, 1)]
                );
            }
        }
        console.log('   ✅ Notifications inserted.');

        // ─── 13. ACTIVITY LOGS ────────────────────────────────────
        console.log('📝 Inserting activity logs...');
        const actions = [
            'Created project', 'Added member', 'Created task', 'Updated task status',
            'Uploaded file', 'Sent message', 'Scheduled meeting', 'Added code snippet',
            'Completed task', 'Left a comment',
        ];
        for (const pid of projectIds) {
            const members = [...memberSets[pid]];
            for (let a = 0; a < randInt(5, 15); a++) {
                await db.query(
                    'INSERT INTO activity_logs (user_id, project_id, action) VALUES (?, ?, ?)',
                    [rand(members), pid, rand(actions)]
                );
            }
        }
        console.log('   ✅ Activity logs inserted.');

        // ─── 14. PROJECT INVITATIONS ──────────────────────────────
        console.log('📩 Inserting project invitations...');
        for (const pid of projectIds.slice(0, 5)) {
            for (let i = 0; i < 3; i++) {
                const invitee = EXTRA_USERS[randInt(30, 60)];
                const emailName = invitee.name.toLowerCase().replace(/[^a-z]/g, '').substring(0, 10);
                try {
                    await db.query(
                        'INSERT INTO project_invitations (project_id, invited_by, invited_user_email, status) VALUES (?, ?, ?, ?)',
                        [pid, adminId, `${emailName}@invited.com`, rand(['pending', 'accepted', 'rejected'])]
                    );
                } catch (e) { }
            }
        }
        console.log('   ✅ Project invitations inserted.');

        console.log('\n🎉 Seed complete! 100 users, 10 projects, and all table data inserted.\n');
        console.log('🔑 All users password: 123456');
        console.log('👑 Admin: sanjay@gmail.com | thilak@gmail.com\n');

    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    }
}

module.exports = seedDatabase;

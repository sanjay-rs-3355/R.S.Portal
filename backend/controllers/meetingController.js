const db = require('../config/db');
const logActivity = require('../utils/activityLogger');

const getMeetings = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const projectId = req.query.projectId;

        let query;
        let params = [];

        if (role === 'admin') {
            // Admin sees upcoming meetings for the project(s)
            query = `
                SELECT m.*, u.name as creator_name, p.title as project_title
                FROM meetings m
                JOIN users u ON m.created_by = u.id
                JOIN projects p ON m.project_id = p.id
                WHERE (m.meeting_date > CURDATE() OR (m.meeting_date = CURDATE() AND m.meeting_time >= CURTIME()))
                ${projectId ? 'AND m.project_id = ?' : ''}
                ORDER BY m.meeting_date ASC, m.meeting_time ASC
                LIMIT 5
            `;
            if (projectId) params = [projectId];
        } else {
            // Normal users only see meetings they are invited to
            query = `
                SELECT m.*, u.name as creator_name, p.title as project_title
                FROM meetings m
                JOIN meeting_participants mp ON m.id = mp.meeting_id
                JOIN users u ON m.created_by = u.id
                JOIN projects p ON m.project_id = p.id
                WHERE mp.user_id = ? 
                AND (m.meeting_date > CURDATE() OR (m.meeting_date = CURDATE() AND m.meeting_time >= CURTIME()))
                ${projectId ? 'AND m.project_id = ?' : ''}
                ORDER BY m.meeting_date ASC, m.meeting_time ASC
                LIMIT 5
            `;
            params = [userId];
            if (projectId) params.push(projectId);
        }

        const [meetings] = await db.execute(query, params);

        // Fetch participants for each meeting
        for (let meeting of meetings) {
            const [participants] = await db.execute(`
                SELECT u.id, u.name, u.profile_image
                FROM users u
                JOIN meeting_participants mp ON u.id = mp.user_id
                WHERE mp.meeting_id = ?
            `, [meeting.id]);
            meeting.participants = participants;
        }

        res.json(meetings);
    } catch (error) {
        next(error);
    }
};

const createMeeting = async (req, res, next) => {
    try {
        const { projectId, title, description, meetingDate, meetingTime, meetingType, meetingLink, location, participantIds } = req.body;
        const createdBy = req.user.id;

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            const [result] = await connection.execute(
                'INSERT INTO meetings (project_id, title, description, meeting_date, meeting_time, meeting_type, meeting_link, location, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [projectId, title, description, meetingDate, meetingTime, meetingType, meetingLink || null, location || null, createdBy]
            );

            const meetingId = result.insertId;

            // Add participants
            if (participantIds && participantIds.length > 0) {
                for (let userId of participantIds) {
                    await connection.execute(
                        'INSERT INTO meeting_participants (meeting_id, user_id) VALUES (?, ?)',
                        [meetingId, userId]
                    );
                }
            }

            await connection.commit();

            // Log activity after commit
            await logActivity(createdBy, projectId, `📅 New meeting scheduled: ${title}`, 'meeting');

            res.status(201).json({ message: 'Meeting scheduled successfully', meetingId });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMeetings,
    createMeeting
};

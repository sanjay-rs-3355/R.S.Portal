const db = require('../config/db');
const bcrypt = require('bcrypt');


// 1️⃣ Suspend User (Admin only)
const suspendUser = async (req, res, next) => {
    const userId = req.params.id;

    try {
        await db.execute(
            "UPDATE users SET status = 'suspended' WHERE id = ?",
            [userId]
        );

        res.json({ message: "User suspended successfully" });

    } catch (error) {
        console.error(error);
        next(error);
    }
};

// 0️⃣ Get All Users (Admin only)
const getAllUsers = async (req, res, next) => {
    try {
        const [users] = await db.execute(`
            SELECT u.id, u.name, u.email, u.role, u.designation, u.status, u.profile_image, u.created_at,
            (SELECT COUNT(*) FROM project_members pm WHERE pm.user_id = u.id) as projects_count
            FROM users u
            ORDER BY u.created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error(error);
        next(error);
    }
};


// 2️⃣ Activate User
const activateUser = async (req, res, next) => {
    const userId = req.params.id;

    try {
        await db.execute(
            "UPDATE users SET status = 'active' WHERE id = ?",
            [userId]
        );

        res.json({ message: "User activated successfully" });

    } catch (error) {
        next(error);
    }
};


// 3️⃣ Promote to Admin
const promoteUser = async (req, res, next) => {
    const userId = req.params.id;

    try {
        await db.execute(
            "UPDATE users SET role = 'admin' WHERE id = ?",
            [userId]
        );

        res.json({ message: "User promoted to admin" });

    } catch (error) {
        next(error);
    }
};


// 4️⃣ Demote Admin (protect last admin)
const demoteUser = async (req, res, next) => {
    const userId = req.params.id;

    try {
        const [[adminCount]] = await db.execute(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'admin'"
        );

        if (adminCount.count <= 1) {
            return res.status(400).json({ message: "Cannot demote the last admin" });
        }

        await db.execute(
            "UPDATE users SET role = 'member' WHERE id = ?",
            [userId]
        );

        res.json({ message: "Admin demoted successfully" });

    } catch (error) {
        next(error);
    }
};


// 5️⃣ Delete User (Admin protection)
const deleteUser = async (req, res, next) => {
    const userId = req.params.id;

    try {
        const [[user]] = await db.execute(
            "SELECT role FROM users WHERE id = ?",
            [userId]
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // If user is admin, check admin count
        if (user.role === 'admin') {

            const [[adminCount]] = await db.execute(
                "SELECT COUNT(*) AS count FROM users WHERE role = 'admin'"
            );

            if (adminCount.count <= 1) {
                return res.status(400).json({ message: "Cannot delete the last admin" });
            }

            // Check if admin owns any projects
            const [ownedProjects] = await db.execute(
                "SELECT id FROM projects WHERE created_by = ? AND is_deleted = FALSE",
                [userId]
            );

            if (ownedProjects.length > 0) {
                return res.status(400).json({
                    message: "Transfer project ownership before deleting this admin account"
                });
            }
        }

        await db.execute("DELETE FROM users WHERE id = ?", [userId]);

        res.json({ message: "User deleted successfully" });

    } catch (error) {
        console.error(error);
        next(error);
    }
};

// 6️⃣ Get Profile
const getProfile = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const [[user]] = await db.execute(`
            SELECT id, name, email, role, designation, status, profile_image, created_at,
            (SELECT COUNT(*) FROM project_members WHERE user_id = users.id) as projectCount,
            (SELECT COUNT(*) FROM tasks WHERE assigned_to = users.id AND status = 'completed') as taskCount
            FROM users WHERE id = ?
        `, [userId]);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        next(error);
    }
};

// 7️⃣ Update Profile
const updateProfile = async (req, res, next) => {
    const userId = req.user.id;
    const { name, designation, password } = req.body;

    try {
        let query = "UPDATE users SET name = ?, designation = ?";
        let params = [name, designation];

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ", password = ?";
            params.push(hashedPassword);
        }

        query += " WHERE id = ?";
        params.push(userId);

        await db.execute(query, params);
        res.json({ message: "Profile updated successfully" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    suspendUser,
    activateUser,
    promoteUser,
    demoteUser,
    deleteUser,
    getAllUsers,
    getProfile,
    updateProfile
};

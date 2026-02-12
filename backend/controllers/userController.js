const db = require('../config/db');
const bcrypt = require('bcrypt');


// 1️⃣ Suspend User (Admin only)
const suspendUser = async (req, res) => {
    const userId = req.params.id;

    try {
        await db.execute(
            "UPDATE users SET status = 'suspended' WHERE id = ?",
            [userId]
        );

        res.json({ message: "User suspended successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// 2️⃣ Activate User
const activateUser = async (req, res) => {
    const userId = req.params.id;

    try {
        await db.execute(
            "UPDATE users SET status = 'active' WHERE id = ?",
            [userId]
        );

        res.json({ message: "User activated successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};


// 3️⃣ Promote to Admin
const promoteUser = async (req, res) => {
    const userId = req.params.id;

    try {
        await db.execute(
            "UPDATE users SET role = 'admin' WHERE id = ?",
            [userId]
        );

        res.json({ message: "User promoted to admin" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};


// 4️⃣ Demote Admin (protect last admin)
const demoteUser = async (req, res) => {
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
        res.status(500).json({ message: "Server error" });
    }
};


// 5️⃣ Delete User (Admin protection)
const deleteUser = async (req, res) => {
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
        res.status(500).json({ message: "Server error" });
    }
};


module.exports = {
    suspendUser,
    activateUser,
    promoteUser,
    demoteUser,
    deleteUser
};

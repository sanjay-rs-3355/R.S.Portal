// ===== VALIDATION MIDDLEWARE =====

/**
 * Validate project creation/update body
 */
function validateProject(req, res, next) {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Project title is required (min 2 chars).' });
    }
    req.body.title = title.trim();
    if (req.body.description) req.body.description = req.body.description.trim();
    next();
}

/**
 * Validate task creation body
 */
function validateTask(req, res, next) {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Task title is required (min 2 chars).' });
    }
    req.body.title = title.trim();
    next();
}

/**
 * Validate login credentials
 */
function validateLogin(req, res, next) {
    const { email, password } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }
    if (!password || password.length < 4) {
        return res.status(400).json({ success: false, message: 'Password must be at least 4 characters.' });
    }
    next();
}

/**
 * Validate registration
 */
function validateRegister(req, res, next) {
    const { name, email, password } = req.body;
    if (!name || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Name is required (min 2 chars).' });
    }
    if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }
    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();
    next();
}

module.exports = { validateProject, validateTask, validateLogin, validateRegister };

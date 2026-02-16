const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

const requireManager = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: 'Manager access required.' });
    }
    next();
};

const requireTester = (req, res, next) => {
    if (['admin', 'manager', 'tester'].includes(req.user.role)) {
        return next();
    }
    return res.status(403).json({ message: 'Tester/Manager/Admin access required.' });
};

module.exports = { requireAdmin, requireManager, requireTester };

const jwt = require('jsonwebtoken');
const Admin = require('../models/admin/adminModel');

const isAuthenticated = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Failed to authenticate token' });
        }
        console.log('Decoded user:', decoded);  
        req.user = decoded;
        next();
    });
};


const isAdmin = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (admin && ['Barangay Captain', 'Secretary', 'Kagawad'].includes(admin.roleinBarangay)) {
            next();
        } else {
            res.status(403).json({ message: 'Access denied: Admins only' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

const isAuthorized = (roleinBarangay) => async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (admin && roleinBarangay.includes(admin.roleinBarangay)) {
            next();
        } else {
            res.status(403).json({ message: 'Access denied: Insufficient permissions' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

module.exports = { isAuthenticated, isAdmin, isAuthorized };

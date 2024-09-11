const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');
const { isAuthenticated, isAuthorized } = require('../../middleware/authMiddleware');
const multer = require('multer'); 
const path = require('path');      

// Multer setup for profile picture uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/profile_pics');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only .png, .jpg, and .jpeg formats are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// Multer setup for valid ID uploads
const validIDStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/valid_ids'); // Directory to store valid ID files
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const validIDFileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only .pdf, .jpeg, .jpg, and .png formats are allowed!'), false);
    }
};

const uploadValidIDs = multer({
    storage: validIDStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
    fileFilter: validIDFileFilter
});

// Define routes
router.post('/admin/login', adminController.signInAdmin);
router.post('/new/admin', upload.single('profilepic'), uploadValidIDs.array('validIDs', 10), adminController.addNewAdmin);
router.get('/all/admins', adminController.findAllAdmins);
router.put('/admin/:id', adminController.updateAdmin);
router.delete('/admin/:id', isAuthenticated, isAuthorized(['Barangay Captain']), adminController.deleteAdminById);
router.get('/admin/:email', adminController.findAdminByEmail);
router.get('/admin/id/:id', adminController.getAdminById);
router.get('/admin/verify/:token', adminController.verifyEmail);
router.post('/admin/resend-verification', adminController.resendVerificationEmail);

module.exports = router;

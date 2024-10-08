const express = require('express');
const router = express.Router();
const residentController = require('../../controllers/resident/residentController');
const { isAuthenticated, isAdmin } = require('../../middleware/authMiddleware');
const multer = require('multer'); // Import multer

// Multer configuration for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); 
    }
});

const upload = multer({ storage: storage }); 

// Resident Authentication
router.post('/login/resident', residentController.signInResident);

// Resident CRUD operations
router.post(
    '/new/resident',
    residentController.upload, 
    residentController.addNewResident
);


router.get('/residents', residentController.getAllResidents);
router.get('/residents/:id', residentController.getResidentById);
router.put('/residents/:id', residentController.upload, residentController.updateResidentById);
router.delete('/residents/:id', isAuthenticated, residentController.deleteResidentById);

// Forgot password route
router.post('/resident/forgot-password', residentController.forgotPassword);

// Reset password route
router.post('/resident/reset-password', residentController.resetPassword);

// Verify security code route
router.post('/resident/verify-security-code', residentController.verifySecurityCode);


// Resident approval and denial
router.put('/residents/approve/:id', isAuthenticated, isAdmin, residentController.approveResident);
router.put('/residents/deny/:id', isAuthenticated, isAdmin, residentController.denyResident);

// Route to handle email verification
router.get('/verify/:token', residentController.verifyEmail); // Add this route for email verification

module.exports = router;

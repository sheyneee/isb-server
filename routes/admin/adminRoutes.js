const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');
const { isAuthenticated, isAuthorized } = require('../../middleware/authMiddleware');
const multer = require('multer'); 
const path = require('path');      


// Define routes
router.post('/admin/login', adminController.signInAdmin);
router.post('/new/admin', adminController.uploadFiles, adminController.addNewAdmin);
router.get('/all/admins', adminController.findAllAdmins);
router.put('/admin/:id', adminController.uploadFiles, adminController.updateAdmin);
router.delete('/admin/:id', isAuthenticated, isAuthorized(['Barangay Captain']), adminController.deleteAdminById);
router.get('/admin/:email', adminController.findAdminByEmail);
router.get('/admin/id/:id', adminController.getAdminById);
router.get('/admin/verify/:token', adminController.verifyEmail);
router.post('/admin/resend-verification', adminController.resendVerificationEmail);

module.exports = router;

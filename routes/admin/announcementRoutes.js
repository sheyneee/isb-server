const express = require('express');
const announcementController = require('../../controllers/admin/announcementController');
const router = express.Router();

// Use the upload middleware to handle multiple file uploads (e.g., max 5 files at once)
router.post('/new/announcements', announcementController.upload.single('attachments'), announcementController.createAnnouncement);
router.get('/announcements', announcementController.getAllAnnouncements);
router.get('/announcements/:id', announcementController.getAnnouncementById);
router.put('/update/announcements/:id', announcementController.upload.single('attachments'), announcementController.updateAnnouncementById);
router.delete('/announcements/:id', announcementController.deleteAnnouncementById);

module.exports = router;

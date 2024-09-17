const express = require('express');
const announcementController = require('../../controllers/admin/announcementController');
const router = express.Router();

// Use the upload middleware defined in the controller
router.post('/new/announcements', announcementController.upload, announcementController.createAnnouncement);
router.get('/announcements', announcementController.getAllAnnouncements);
router.get('/announcements/:id', announcementController.getAnnouncementById);
router.put('/update/announcements/:id', announcementController.upload, announcementController.updateAnnouncementById);
router.delete('/announcements/:id', announcementController.deleteAnnouncementById);

module.exports = router;

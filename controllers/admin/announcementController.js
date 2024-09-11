const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Announcement = require('../../models/admin/announcementModel');
const Admin = require('../../models/admin/adminModel');

// Directory for storing uploads
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const ANNOUNCEMENT_DIR = path.join(UPLOAD_DIR, 'announcements');

// Check if the upload directory and subdirectory exist, if not, create them
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(ANNOUNCEMENT_DIR)) {
    fs.mkdirSync(ANNOUNCEMENT_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, ANNOUNCEMENT_DIR); // Use the announcements subdirectory
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Rename files to avoid conflicts
    }
});

const upload = multer({ storage });

// Create a new announcement
const createAnnouncement = async (req, res) => {
    try {
        const { adminID, announcementCategory, title, content, Importance } = req.body;

        // Check if the Admin exists
        const adminExists = await Admin.findById(adminID);
        if (!adminExists) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Handle file attachment
        const attachment = req.file ? req.file.filename : null; // Store only the filename

        // Create the announcement
        const newAnnouncement = new Announcement({
            adminID: adminExists._id,
            announcementCategory, // Directly use announcementCategory
            title,
            content,
            attachments: attachment,
            Importance,
        });

        const savedAnnouncement = await newAnnouncement.save();
        res.status(201).json({ announcement: savedAnnouncement, message: 'Announcement created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

// Get all announcements
const getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find().populate('adminID', 'name email').populate('updated_by', 'name email');
        res.status(200).json({ announcements });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

// Get a single announcement by ID
const getAnnouncementById = async (req, res) => {
    try {
        const { id } = req.params;
        const announcement = await Announcement.findById(id).populate('adminID', 'name email').populate('updated_by', 'name email');
        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }
        res.status(200).json({ announcement });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

const updateAnnouncementById = async (req, res) => {
    try {
        const { id } = req.params;
        const { announcementCategory, title, content, Importance, updated_by } = req.body;

        // Check if the updating admin exists
        const adminExists = await Admin.findById(updated_by);
        if (!adminExists) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Handle file attachment update
        const attachment = req.file ? req.file.filename : undefined; // Store only the filename if provided

        const updateData = {
            announcementCategory,
            title,
            content,
            Importance,
            updated_at: Date.now(),
            updated_by: adminExists._id, // Track who made the update
        };

        if (attachment) {
            updateData.attachments = attachment;
        }

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedAnnouncement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.status(200).json({ announcement: updatedAnnouncement, message: 'Announcement updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

// Delete an announcement by ID
const deleteAnnouncementById = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedAnnouncement = await Announcement.findByIdAndDelete(id);

        if (!deletedAnnouncement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.status(200).json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

module.exports = {
    createAnnouncement,
    getAllAnnouncements,
    getAnnouncementById,
    updateAnnouncementById,
    deleteAnnouncementById,
    upload,
};

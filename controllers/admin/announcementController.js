const multer = require('multer');
const Announcement = require('../../models/admin/announcementModel');
const Admin = require('../../models/admin/adminModel');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'); // Import S3

// AWS S3 setup
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Helper function to upload a file to S3
const uploadToS3 = async (file, folder) => {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype, // Correct content type
    };

    try {
        console.log('Uploading file to S3:', fileName);
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        // Return the URL of the uploaded file
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error('File upload to S3 failed.');
    }
};

// Multer setup for in-memory storage
const upload = multer({ storage: multer.memoryStorage() }).fields([
    { name: 'attachments', maxCount: 1 },
]);

// Create a new announcement
const createAnnouncement = async (req, res) => {
    try {
        const { adminID, announcementCategory, title, content, Importance } = req.body;

        // Check if the Admin exists
        const adminExists = await Admin.findById(adminID);
        if (!adminExists) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Handle file attachment (upload to S3 if present)
        let attachmentUrl = null;
        if (req.files && req.files.attachments && req.files.attachments.length > 0) {
            attachmentUrl = await uploadToS3(req.files.attachments[0], 'announcement'); // Save to the 'announcement' folder in S3
        }

        // Create the announcement
        const newAnnouncement = new Announcement({
            adminID: adminExists._id,
            announcementCategory,
            title,
            content,
            attachments: attachmentUrl, // Save the S3 URL
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

// Update an announcement
const updateAnnouncementById = async (req, res) => {
    try {
        const { id } = req.params;
        const { announcementCategory, title, content, Importance, updated_by } = req.body;

        // Check if the updating admin exists
        const adminExists = await Admin.findById(updated_by);
        if (!adminExists) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Handle file attachment update (upload to S3 if present)
        let attachmentUrl;
        if (req.files && req.files.attachments && req.files.attachments.length > 0) {
            attachmentUrl = await uploadToS3(req.files.attachments[0], 'announcement'); // Save to the 'announcement' folder in S3
        }

        const updateData = {
            announcementCategory,
            title,
            content,
            Importance,
            updated_at: Date.now(),
            updated_by: adminExists._id,
        };

        if (attachmentUrl) {
            updateData.attachments = attachmentUrl;
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

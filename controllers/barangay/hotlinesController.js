const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Hotlines = require('../../models/barangay/hotlinesModel');
const multer = require('multer');
const mongoose = require('mongoose');

// AWS S3 setup using AWS SDK v3
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Multer configuration for file handling
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = ['image/png', 'image/jpg', 'image/jpeg'];
        if (allowedFileTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PNG, JPG, and JPEG are allowed.'));
        }
    },
}).single('photo'); // Single file upload for photo field

// Helper function to upload a file to AWS S3 using SDK v3
const uploadToS3 = async (file) => {
    const folderPrefix = 'hotlines/';
    const fileName = folderPrefix + Date.now() + '-' + file.originalname;

    const params = {
        Bucket: process.env.S3_BUCKET_NAME, // S3 bucket name
        Key: fileName, // File name to save as in S3
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        const command = new PutObjectCommand(params);
        const data = await s3Client.send(command);
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error('File upload to S3 failed.');
    }
};

// Controller functions

// Create a new hotline
const createHotline = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        const { name, contactNo } = req.body;

        try {
            // Upload file to S3
            const photoUrl = await uploadToS3(req.file);

            // Create new hotline document
            const newHotline = new Hotlines({
                name,
                contactNo,
                photo: photoUrl,
            });

            await newHotline.save();
            res.status(201).json({ message: 'Hotline created successfully', hotline: newHotline });
        } catch (error) {
            res.status(500).json({ message: 'Error creating hotline', error: error.message });
        }
    });
};

// Get all hotlines
const getAllHotlines = async (req, res) => {
    try {
        const hotlines = await Hotlines.find();
        res.status(200).json(hotlines);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hotlines', error: error.message });
    }
};

// Get a single hotline by ID
const getHotlineById = async (req, res) => {
    try {
        const hotline = await Hotlines.findById(req.params.id);
        if (!hotline) {
            return res.status(404).json({ message: 'Hotline not found' });
        }
        res.status(200).json(hotline);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hotline', error: error.message });
    }
};

// Update a hotline by ID
const updateHotline = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        const { name, contactNo } = req.body;

        try {
            const hotline = await Hotlines.findById(req.params.id);
            if (!hotline) {
                return res.status(404).json({ message: 'Hotline not found' });
            }

            // Upload new photo if present
            if (req.file) {
                const photoUrl = await uploadToS3(req.file);
                hotline.photo = photoUrl;
            }

            // Update other fields
            hotline.name = name || hotline.name;
            hotline.contactNo = contactNo || hotline.contactNo;
            hotline.updated_at = Date.now();

            await hotline.save();
            res.status(200).json({ message: 'Hotline updated successfully', hotline });
        } catch (error) {
            res.status(500).json({ message: 'Error updating hotline', error: error.message });
        }
    });
};

// Delete a hotline by ID
const deleteHotline = async (req, res) => {
    try {
        const hotline = await Hotlines.findByIdAndDelete(req.params.id);
        if (!hotline) {
            return res.status(404).json({ message: 'Hotline not found' });
        }
        res.status(200).json({ message: 'Hotline deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting hotline', error: error.message });
    }
};

module.exports = {
    createHotline,
    getAllHotlines,
    getHotlineById,
    updateHotline,
    deleteHotline,
    upload
};

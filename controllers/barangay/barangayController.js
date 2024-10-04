const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Barangay = require('../../models/barangay/barangayModel');
const multer = require('multer');
require('dotenv').config(); // Load environment variables

// AWS S3 setup using AWS SDK v3
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Multer setup for in-memory storage with file type validation for logo
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (allowedFileTypes.includes(file.mimetype)) {
            cb(null, true); // Accept file if valid
        } else {
            cb(new Error('Invalid file type. Only PNG, JPG, and JPEG are allowed.'));
        }
    }
}).single('logo'); // Single file upload for the logo field

// Helper function to upload a file to AWS S3
const uploadToS3 = async (file, folder) => {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error('File upload to S3 failed.');
    }
};

// Create a new barangay with S3 logo upload
const createBarangay = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            // Check if a barangay already exists
            const existingBarangay = await Barangay.findOne();
            if (existingBarangay) {
                return res.status(400).json({ message: 'A Barangay already exists. Only one Barangay can be created.' });
            }

            // Upload the logo to S3 if provided
            let logoUrl = '';
            if (req.file) {
                logoUrl = await uploadToS3(req.file, 'barangay/logo');
            }

            // Create new barangay document
            const newBarangay = new Barangay({
                barangayName: req.body.barangayName,
                region: req.body.region,
                email: req.body.email,
                logo: logoUrl,
                contactnumber: req.body.contactnumber,
                province: req.body.province,
                municipality: req.body.municipality,
                postalcode: req.body.postalcode,
                location: req.body.location,
                history: req.body.history
            });

            await newBarangay.save();
            res.status(201).json({ message: 'Barangay created successfully', barangay: newBarangay });
        } catch (error) {
            res.status(500).json({ message: 'Error creating barangay', error: error.message });
        }
    });
};

// Get all barangays
const getAllBarangays = async (req, res) => {
    try {
        const barangays = await Barangay.find();
        res.json({ barangays });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Get a barangay by ID
const getBarangayById = async (req, res) => {
    try {
        const barangay = await Barangay.findById(req.params.id);
        if (!barangay) {
            return res.status(404).json({ message: 'Barangay not found' });
        }
        res.json({ barangay });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Update a barangay by ID
const updateBarangayById = async (req, res) => {
    try {
        const barangay = await Barangay.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!barangay) {
            return res.status(404).json({ message: 'Barangay not found' });
        }
        res.json({ barangay, message: 'Barangay updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Delete a barangay by ID
const deleteBarangayById = async (req, res) => {
    try {
        const barangay = await Barangay.findByIdAndDelete(req.params.id);
        if (!barangay) {
            return res.status(404).json({ message: 'Barangay not found' });
        }
        res.json({ barangay, message: 'Barangay deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        console.log('Fetching barangay data for dashboard...');
        // Assuming there's only one barangay in the system
        const barangay = await Barangay.findOne();
        
        if (!barangay) {
            console.error('No barangay found in the database.');
            return res.status(404).json({ message: 'Barangay not found' });
        }

        // Extract the statistics
        const stats = {
            totalPopulation: barangay.population,
            totalVoters: barangay.totalvoters,
            totalIndigent: barangay.totalindigent,
            totalPWDs: barangay.totalpwd,
            totalSeniorCitizens: barangay.totalseniorcitizen,
            totalSoloParents: barangay.totalsoloparent,
            total4Ps: barangay.total4psbeneficiary,
        };

        console.log('Dashboard stats:', stats);
        res.json(stats);
    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};


module.exports = {
    createBarangay,
    getAllBarangays,
    getBarangayById,
    updateBarangayById,
    deleteBarangayById,
    getDashboardStats
};

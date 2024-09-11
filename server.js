const express = require('express');
const cors = require('cors');
const compression = require('compression');
const multer = require('multer');
require('./config/mongo_config');
require('dotenv').config();

const app = express();
const PORT = 8000;

// Middleware setup
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Serve static files from the 'uploads' directory (for local uploads)
app.use('/uploads', express.static('uploads'));

// Ensure local folder structure exists for uploads (Optional)
const fs = require('fs');
const path = require('path');

// Create folder if it doesn't exist (for local uploads)
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};
ensureDirectoryExists(path.join(__dirname, 'uploads/announcements'));

// Multer setup for handling file uploads locally
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/announcements/'); // Directory where files will be saved
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Rename files to avoid conflicts
    }
});

const upload = multer({ storage });

// Routes
const adminRoutes = require('./routes/admin/adminRoutes');
const barangayRoutes = require('./routes/barangay/barangayRoutes');
const residentRoutes = require('./routes/resident/residentRoutes');
const householdRoutes = require('./routes/resident/householdRoutes');
const announcementRoutes = require('./routes/admin/announcementRoutes');
const documentrequestRoutes = require('./routes/resident/documentrequestRoutes');

app.use('/api', adminRoutes);
app.use('/api', barangayRoutes);
app.use('/api', residentRoutes);
app.use('/api', householdRoutes);
app.use('/api', announcementRoutes);
app.use('/api', documentrequestRoutes);

// Example route for file uploads using multer (for local uploads)
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        res.status(200).json({ message: 'File uploaded successfully', file: req.file });
    } catch (error) {
        res.status(400).json({ message: 'Error uploading file', error });
    }
});

// Starting the server
app.listen(PORT, () => {
    console.log(`>> Server is running on port ${PORT} <<`);
});

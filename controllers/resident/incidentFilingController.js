const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const IncidentReport = require('../../models/resident/incidentFilingModel');
const Resident = require('../../models/resident/residentModel');
const Admin = require('../../models/admin/adminModel');
const mongoose = require('mongoose');
const multer = require('multer');

// AWS S3 setup using AWS SDK v3
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Multer storage configuration to store files in memory temporarily
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = ['image/png', 'image/jpg', 'image/jpeg', 'video/mp4', 'video/mov', 'video/avi', 'video/mkv'];
        if (allowedFileTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PNG, JPG, MP4, MOV, AVI, and MKV are allowed.'));
        }
    },
}).array('attachments', 10); 


// Helper function to upload a file to AWS S3
const uploadToS3 = async (file) => {
    const folderPrefix = 'incident-attachments/';
    const fileName = folderPrefix + Date.now() + '-' + file.originalname;

    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName, // File name to save in S3
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

// Helper function to generate a random 6-digit number
// Helper function to generate a unique ReferenceNo in the format 'IR-2024-XXXXXX'
const generateRandomReferenceNo = () => {
    const year = new Date().getFullYear();  // Get the current year
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString(); // Generate random 6-digit number
    return `IR-${year}-${randomDigits}`;
};

// Helper function to check if a generated ReferenceNo is unique
const isReferenceNoUnique = async (referenceNo) => {
    const report = await IncidentReport.findOne({ ReferenceNo: referenceNo });
    return !report;  // Return true if no report found, meaning the ReferenceNo is unique
};

// Controller to handle incident report creation
const createIncidentReport = async (req, res) => {
    try {
               const { 
                complainantID, 
                complainantByType, 
                complainantname, 
                respondentname, 
                typeofcomplaint, 
                incidentdescription, 
                relieftobegranted, 
                dateAndTimeofIncident, 
                status 
            } = req.body;

        if (!['Resident', 'Admin'].includes(complainantByType)) {
            return res.status(400).json({ message: "complainantByType must be either 'Resident' or 'Admin'" });
        }

        if (!mongoose.Types.ObjectId.isValid(complainantID)) {
            return res.status(400).json({ message: "Invalid complainant ID" });
        }

        // Validate if complainant exists in the relevant model
        const model = complainantByType === 'Resident' ? Resident : Admin;
        const complainant = await model.findById(complainantID);
        if (!complainant) {
            return res.status(404).json({ message: `${complainantByType} not found` });
        }

        // Handle file uploads and store the attachments in S3
        const attachmentFiles = req.files ? await Promise.all(
            req.files.map(async (file) => ({
                originalname: file.originalname,
                mimetype: file.mimetype,
                url: await uploadToS3(file)  // Upload file to S3 and get the URL
            }))
        ) : [];

           
        let ReferenceNo;
        let isUnique = false;

        // Keep generating ReferenceNo until we find a unique one
        while (!isUnique) {
            ReferenceNo = generateRandomReferenceNo();
            isUnique = await isReferenceNoUnique(ReferenceNo);
        }

        // Parse complainantname and respondentname if they are in JSON format
        const parsedComplainantName = Array.isArray(complainantname) 
            ? complainantname 
            : JSON.parse(complainantname);

        const parsedRespondentName = Array.isArray(respondentname) 
            ? respondentname 
            : JSON.parse(respondentname);

        // Create the incident report with optional archived_at date if status is 'Archived'
        const newIncidentReport = new IncidentReport({
            complainantID,
            complainantByType,
            complainantname: parsedComplainantName,
            respondentname: parsedRespondentName,
            typeofcomplaint,
            incidentdescription,
            relieftobegranted,
            ReferenceNo,
            dateAndTimeofIncident,
            Attachment: attachmentFiles,
            status,
            ...(status === 'Archived' && { archived_at: new Date() })
        });

        await newIncidentReport.save();
        
        res.status(201).json({  message: 'Incident report created successfully',referenceNo: newIncidentReport.ReferenceNo, report: newIncidentReport });
    } catch (error) {
        console.error('Error creating incident report:', error.stack);
        res.status(500).json({ message: "Failed to create incident report", error: error.message });
    }
};


// Controller to get all incident reports
const getAllIncidentReports = async (req, res) => {
    try {
        const reports = await IncidentReport.find().populate('complainantID');
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch incident reports", error: error.message });
    }
};

// Controller to get an incident report by ID
const getIncidentReportById = async (req, res) => {
    try {
        const reportId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ message: "Invalid report ID" });
        }

        const report = await IncidentReport.findById(reportId).populate('complainantID');

        if (!report) {
            return res.status(404).json({ message: "Incident report not found" });
        }

        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch incident report", error: error.message });
    }
};

// Controller to update an incident report
// Controller to update an incident report
const updateIncidentReport = async (req, res) => {
    try {
        const reportId = req.params.id;
        const { typeofcomplaint, incidentdescription, status, dateAndTimeofIncident } = req.body;

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ message: "Invalid report ID" });
        }

        // Find the existing report to compare the status
        const existingReport = await IncidentReport.findById(reportId);
        if (!existingReport) {
            return res.status(404).json({ message: "Incident report not found" });
        }

        // Handle file uploads and store the attachments in S3
        let attachmentFiles = [];
        if (req.files) {
            attachmentFiles = await Promise.all(
                req.files.map(async (file) => ({
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    url: await uploadToS3(file),
                }))
            );
        }

        // Prepare fields to be updated
        let updatedFields = {
            typeofcomplaint,
            incidentdescription,
            dateAndTimeofIncident,
            status,
            ...(attachmentFiles.length > 0 && { Attachment: attachmentFiles }),  // Update attachments only if new files are uploaded
        };

        // If changing to "Archived", set `archived_at` to the current date
        if (status === 'Archived' && existingReport.status !== 'Archived') {
            updatedFields.archived_at = new Date();
        }

        // If changing status from "Archived" to any other status, clear `archived_at`
        if (status !== 'Archived' && existingReport.status === 'Archived') {
            updatedFields.archived_at = null;
        }

        // Update the incident report
        const updatedReport = await IncidentReport.findByIdAndUpdate(
            reportId,
            updatedFields,
            { new: true, runValidators: true }
        );

        res.status(200).json({ message: "Incident report updated successfully", report: updatedReport });
    } catch (error) {
        res.status(500).json({ message: "Failed to update incident report", error: error.message });
    }
};


// Controller to delete an incident report
const deleteIncidentReport = async (req, res) => {
    try {
        const reportId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ message: "Invalid report ID" });
        }

        const deletedReport = await IncidentReport.findByIdAndDelete(reportId);

        if (!deletedReport) {
            return res.status(404).json({ message: "Incident report not found" });
        }

        res.status(200).json({ message: "Incident report deleted successfully", report: deletedReport });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete incident report", error: error.message });
    }
};

// Controller to get incident reports by userId
const getIncidentReportHistoryByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        // Fetch reports where the complainantID matches the provided userId
        const reports = await IncidentReport.find({ complainantID: userId }).populate('complainantID');

        if (!reports || reports.length === 0) {
            return res.status(404).json({ message: "No incident reports found for this user" });
        }

        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch incident report history", error: error.message });
    }
};

module.exports = {
    createIncidentReport,
    getAllIncidentReports,
    getIncidentReportById,
    updateIncidentReport,
    deleteIncidentReport,
    getIncidentReportHistoryByUser,
    upload
};

const { BlobServiceClient } = require('@azure/storage-blob');
const DocumentRequest = require('../../models/resident/documentrequestModel');
const Resident = require('../../models/resident/residentModel');
const Admin = require('../../models/admin/adminModel');
const mongoose = require('mongoose');
const multer = require('multer');

// Azure Blob Storage setup
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerName = 'iservebarangay';  // Replace with your Azure container name
const containerClient = blobServiceClient.getContainerClient(containerName);

// Check if the container exists, and if not, create it
const ensureContainerExists = async () => {
    const containerExists = await containerClient.exists();
    if (!containerExists) {
        await containerClient.create();
        console.log(`Container "${containerName}" created.`);
    }
};


// Multer storage configuration to store files in memory temporarily
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = ['image/png', 'image/jpg', 'image/jpeg', 'application/pdf'];
        if (allowedFileTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, PNG, JPG, and JPEG are allowed.'));
        }
    }
}).fields([
    { name: 'ValidID', maxCount: 5 }
]);

// Helper function to upload a file to Azure Blob Storage
const uploadToAzure = async (file) => {
    const folderPrefix = 'documentrequest-validid/';
    const blobName = folderPrefix + Date.now() + '-' + file.originalname; // Add folder prefix
    const blobServiceClient = new BlobServiceClient(`${process.env.BLOB_SAS_URL}`);
    const containerClient = blobServiceClient.getContainerClient('iservebarangay');
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
        // Ensure the container exists
        await ensureContainerExists();

        // Upload the file to Azure Blob Storage
        await blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders: { blobContentType: file.mimetype }  // Set the content type
        });

        // Append SAS token for secure access
        const fileUrlWithSAS = `${blockBlobClient.url}${process.env.BLOB_SAS_TOKEN}`;

        return fileUrlWithSAS;  // Return the URL of the uploaded file with SAS token
    } catch (error) {
        console.error('Error uploading to Azure:', error);
        throw new Error('File upload to Azure failed.');
    }
};

const generateReferenceNo = async () => {
    let referenceNo;
    let exists = true;
    
    // Ensure the generated reference number is unique
    do {
        // Generate a random 10-digit number
        referenceNo = Math.floor(1000000000 + Math.random() * 9000000000).toString(); 

        // Check if the reference number already exists in the database
        const existingRequest = await DocumentRequest.findOne({ ReferenceNo: referenceNo });
        exists = !!existingRequest;
    } while (exists);  // Repeat until the reference number is unique

    return referenceNo;
};


// Create a new document request with ValidID and unique ReferenceNo
const createDocumentRequest = async (req, res) => {
    try {
        console.log("Received data:", req.body);
        console.log("Files uploaded:", req.files);

        const {
            requestedBy,
            requestedByType,
            residentName,
            recipient,
            documentType,
            purpose,
            status,
            remarks
        } = req.body;

        // Validate requestedByType
        if (!['Resident', 'Admin'].includes(requestedByType)) {
            return res.status(400).json({ message: "requestedByType must be either 'Resident' or 'Admin'" });
        }

        // Validate requestedBy ObjectId
        if (!mongoose.Types.ObjectId.isValid(requestedBy)) {
            return res.status(400).json({ message: "Invalid requestedBy ID" });
        }

        // Validate if the requester exists in the relevant model
        const model = requestedByType === 'Resident' ? Resident : Admin;
        const requester = await model.findById(requestedBy);
        if (!requester) {
            return res.status(404).json({ message: `${requestedByType} not found` });
        }

        // Generate a unique reference number
        const referenceNo = await generateReferenceNo();

        // Upload each file to Azure and get its URL
        const validIDFiles = req.files && req.files.ValidID ? await Promise.all(
            req.files.ValidID.map(async (file) => ({
                originalname: file.originalname,
                mimetype: file.mimetype,
                url: await uploadToAzure(file)  // Upload file to Azure and get the URL
            }))
        ) : [];

        // If no valid IDs are uploaded, return an error
        if (validIDFiles.length === 0) {
            return res.status(400).json({ message: "At least one valid ID must be uploaded." });
        }

        // Create and save the document request with the Azure URLs and generated ReferenceNo
        const newRequest = new DocumentRequest({
            requestedBy,
            requestedByType,
            ReferenceNo: referenceNo,  // Add generated reference number
            residentName,
            recipient,
            documentType,
            purpose,
            ValidID: validIDFiles,  // Store file URLs
            status,
            remarks
        });

        await newRequest.save();
        res.status(201).json({ message: "Document request created successfully", request: newRequest });
    } catch (error) {
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: "Failed to create document request", error: error.message });
    }
};



// Get all document requests
const getAllDocumentRequests = async (req, res) => {
    try {
        const requests = await DocumentRequest.find().populate('requestedBy approvedBy');
        res.status(200).json({ requests });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch document requests", error: error.message });
    }
};

const getDocumentRequestById = async (req, res) => {
    try {
        const requestId = req.params.id;

        // Validate the request ID
        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ message: "Invalid document request ID" });
        }

        // Find the document request by ID and populate the requestedBy and approvedBy fields
        const request = await DocumentRequest.findById(requestId)
            .populate('requestedBy')
            .populate('approvedBy');

        if (!request) {
            return res.status(404).json({ message: "Document request not found" });
        }

        // Return the request data, including the ValidID Azure URLs
        res.status(200).json({ request });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch document request", error: error.message });
    }
};

// Update a document request by ID with Base64 encoded ValidID
const updateDocumentRequestById = async (req, res) => {
    try {
        const requestId = req.params.id;
        const {
            residentName,
            recipient,
            documentType,
            purpose,
            status,
            remarks
        } = req.body;

        // Validate the request ID
        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ message: "Invalid document request ID" });
        }

        // If new ValidID files are uploaded, upload them to Azure Blob Storage and get their URLs
        let validIDFiles = [];
        if (req.files && req.files.ValidID) {
            validIDFiles = await Promise.all(
                req.files.ValidID.map(async (file) => ({
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    url: await uploadToAzure(file)  // Upload file to Azure and get the URL
                }))
            );
        }

        // Find and update the document request
        const updatedRequest = await DocumentRequest.findByIdAndUpdate(
            requestId,
            {
                residentName,
                recipient,
                documentType,
                purpose,
                // If new ValidID files were uploaded, update the ValidID field
                ...(validIDFiles.length > 0 && { ValidID: validIDFiles }),
                status,
                remarks,
                updated_at: Date.now()
            },
            { new: true, runValidators: true }
        ).populate('requestedBy approvedBy');

        if (!updatedRequest) {
            return res.status(404).json({ message: "Document request not found" });
        }

        // Return the updated request data, including the new ValidID URLs
        res.status(200).json({ message: "Document request updated successfully", request: updatedRequest });
    } catch (error) {
        res.status(500).json({ message: "Failed to update document request", error: error.message });
    }
};



// Delete a document request by ID
const deleteDocumentRequestById = async (req, res) => {
    try {
        const requestId = req.params.id;

        // Validate the request ID
        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ message: "Invalid document request ID" });
        }

        // Find and delete the document request
        const deletedRequest = await DocumentRequest.findByIdAndDelete(requestId);
        if (!deletedRequest) {
            return res.status(404).json({ message: "Document request not found" });
        }

        res.status(200).json({ message: "Document request deleted successfully", request: deletedRequest });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete document request", error: error.message });
    }
};

// Get document request history for the logged-in user (resident or admin)
const getDocumentRequestHistory = async (req, res) => {
    try {
        const { residentId } = req.params;  // Get residentId from params

        // Log for debugging
        console.log('Resident ID received:', residentId);

        // Validate and convert residentId to ObjectId
        if (!mongoose.Types.ObjectId.isValid(residentId)) {
            console.log('Invalid residentId:', residentId);
            return res.status(400).json({ message: "Invalid document request ID" });
        }

        // Use 'new' keyword to instantiate ObjectId
        const documentRequests = await DocumentRequest.find({
            requestedBy: new mongoose.Types.ObjectId(residentId)  // Use 'new' here
        }).populate('requestedBy').populate('approvedBy');

        if (!documentRequests.length) {
            return res.status(404).json({ message: "No document requests found for this user" });
        }

        res.status(200).json(documentRequests);
    } catch (error) {
        console.error('Error fetching document request history:', error);
        res.status(500).json({ message: 'Failed to fetch document request history', error: error.message });
    }
};

module.exports = {
    createDocumentRequest,
    getAllDocumentRequests,
    getDocumentRequestById,
    updateDocumentRequestById,
    deleteDocumentRequestById,
    getDocumentRequestHistory,
    upload
};
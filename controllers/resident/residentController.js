const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const Resident = require('../../models/resident/residentModel');
const Barangay = require('../../models/barangay/barangayModel');
const Household = require('../../models/resident/householdModel');
const Admin = require('../../models/admin/adminModel');
const nodemailer = require('nodemailer');
require('dotenv').config(); // To load environment variables from the .env file

// Create a Nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false 
    }
});


// Define email options
const mailOptions = {
    from: process.env.GMAIL_USER, // Sender's email address
    to: 'sheynedelacruz@gmai.com', // Recipient's email address
    subject: 'Email Verification',
    text: 'This is a test email for verification purposes!',
    html: '<p>Click <a href="your-verification-link">here</a> to verify your email</p>', // You can add HTML here
};

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('Error sending email:', error);
    } else {
        console.log('Email sent:', info.response);
    }
});

const sendVerificationEmail = async (resident, req) => {
    try {
        const token = jwt.sign({ id: resident._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        resident.verificationToken = token;
        resident.verificationTokenExpiry = Date.now() + 3600000; // 1-hour expiration
        await resident.save();

        const verificationLink = `${req.protocol}://${req.get('host')}/api/verify/${token}`;
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: resident.email, 
            subject: 'Email Verification - Please do not reply to this email',
            html: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Error sending email');
    }
};


// Directory for storing uploads
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Check if the upload directory exists, if not, create it
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR); // Use the verified upload directory
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

const addNewResident = async (req, res) => {
    try {
        const {
            email,
            firstName,
            middleName,
            lastName,
            birthday,
            birthplace,
            sex,
            suffix,
            contactNumber,
            permanentAddress,
            presentAddress,
            nationality,
            religion,
            occupation,
            civilStatus,
            roleinHousehold,
            roleinBarangay,
            householdID,
            voter,
            indigent,
            fourpsmember,
            soloparent,
            pwd,
            seniorCitizen,
            soloparentid_num,
            pwdid_num,
            seniorcitizenid_num,
            philsys_num,
            voters_id,
            sss_num,
            pagibig_num,
            philhealth_num,
            tin_num
        } = req.body;

        // Extract profile picture and valid IDs from req.files
        const profilepic = req.files && req.files.profilepic ? req.files.profilepic[0].path : '';
        const validIDs = req.files && req.files.validIDs ? req.files.validIDs.map(file => file.path) : [];

        // Check for missing required fields
        if (!email) return res.status(400).json({ message: 'Email is required' });
        if (!firstName) return res.status(400).json({ message: 'First name is required' });
        if (!lastName) return res.status(400).json({ message: 'Last name is required' });
        if (!birthday) return res.status(400).json({ message: 'Birthday is required' });
        if (!birthplace) return res.status(400).json({ message: 'Birthplace is required' });
        if (!sex) return res.status(400).json({ message: 'Sex is required' });
        if (!contactNumber) return res.status(400).json({ message: 'Contact number is required' });
        if (!permanentAddress || !permanentAddress.street || !permanentAddress.houseNo) return res.status(400).json({ message: 'Street and House No. are required in the permanentAddress' });
        if (!nationality) return res.status(400).json({ message: 'Nationality is required' });
        if (!civilStatus) return res.status(400).json({ message: 'Civil status is required' });
        if (!roleinHousehold) return res.status(400).json({ message: 'Role in Household is required' });

        // Check if resident already exists
        const existingResident = await Resident.findOne({ email });
        if (existingResident) {
            return res.status(400).json({ message: 'Resident with this email already exists' });
        }

        // Fetch the barangay information
        const barangay = await Barangay.findOne();
        if (!barangay) {
            return res.status(404).json({ message: 'No barangay found' });
        }

        // Create password and new resident
        const currentYear = new Date().getFullYear();
        const sanitizedLastName = lastName.replace(/\s+/g, '').toLowerCase();
        const password = `${currentYear}${sanitizedLastName}${firstName.charAt(0).toLowerCase()}${middleName ? middleName.charAt(0).toLowerCase() : ''}`;

        const newResident = new Resident({
            email,
            password,
            firstName,
            middleName,
            lastName,
            suffix,
            barangay: barangay._id,
            birthday,
            birthplace,
            sex,
            contactNumber,
            permanentAddress,
            presentAddress,
            nationality,
            religion,
            occupation,
            civilStatus,
            roleinHousehold,
            roleinBarangay: 'Resident',
            profilepic, // Save profile picture path
            validIDs, // Save valid ID paths
            voter,
            indigent,
            fourpsmember,
            soloparent,
            pwd,
            seniorCitizen,
            soloparentid_num,
            pwdid_num,
            seniorcitizenid_num,
            philsys_num,
            voters_id,
            sss_num,
            pagibig_num,
            philhealth_num,
            tin_num,
            accountStatus: 'Pending',
            emailVerified: false // Initially not verified
        });

        // Save the new resident
        await newResident.save();

        // If the resident is a family member, update the household
        if (roleinHousehold === 'Household Member' && householdID) {
            const household = await Household.findOne({ householdID: householdID });

            if (!household) {
                return res.status(404).json({ message: 'Household not found' });
            }

            // Update the household with the new resident
            household.members.push(newResident._id);
            await household.save();

            // Update the resident's householdID field
            newResident.householdID = household._id;
            await newResident.save();
        }

        // If the resident is the head of the family, create a new household
        if (roleinHousehold === 'Household Head') {
            const maxHousehold = await Household.findOne().sort('-householdID').exec();
            const householdID = maxHousehold ? maxHousehold.householdID + 1 : 1;

            const newHousehold = new Household({
                householdID,
                householdHead: newResident._id,
                contactNumber: newResident.contactNumber,
                members: [newResident._id]
            });

            // Save the new household
            await newHousehold.save();
            newResident.householdID = newHousehold._id;
            await newResident.save();
        }
        // Send verification email
        await sendVerificationEmail(newResident, req);

        // Send success response with newResident object
        if (!res.headersSent) {
            return res.status(201).json({ newResident, message: 'Resident added. Verification email sent.' });
        }

    } catch (err) {
        console.error('Error in addNewResident:', err);

        // Ensure only one response is sent
        if (!res.headersSent) {
            return res.status(500).json({ message: 'Something went wrong', error: err.message });
        }
    }
};


// Approve a resident
const approveResident = async (req, res) => {
    try {
        const resident = await Resident.findById(req.params.id);
        if (!resident) {
            return res.status(404).json({ message: 'Resident not found' });
        }

        resident.accountStatus = 'Approved';
        resident.approvedBy = req.user.id; // Ensure req.user.id is properly populated
        await resident.save();

        // If the resident is the head of the family, create a new household
        if (resident.roleinHousehold === 'Household Head') {
            const maxHousehold = await Household.findOne().sort('-householdID').exec();
            const householdID = maxHousehold ? maxHousehold.householdID + 1 : 1;

            const newHousehold = new Household({
                householdID,
                householdHead: resident._id,
                contactNumber: resident.contactNumber,
                members: [resident._id]
            });

            await newHousehold.save();
        }

        res.json({ resident, message: 'Resident approved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Deny a resident
const denyResident = async (req, res) => {
    try {
        const resident = await Resident.findById(req.params.id);
        if (!resident) {
            return res.status(404).json({ message: 'Resident not found' });
        }

        const { remarks } = req.body;
        if (!remarks) {
            return res.status(400).json({ message: 'Remarks are required to deny a resident' });
        }

        resident.remarks = remarks; // Save the provided remarks
        resident.accountStatus = 'Denied'; // Update status to 'Denied'
        await resident.save();

        res.json({ resident, message: 'Resident denied successfully with remarks' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

//login
const signInResident = async (req, res) => {
    try {
        const { email, password } = req.body;
        const resident = await Resident.findOne({ email }).populate('barangay');

        // Check if the resident exists
        if (!resident) {
            return res.status(401).json({ message: "Incorrect email or password" });
        }

        // Check if the password is correct
        if (password !== resident.password) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        // Check if the email is verified
        if (!resident.emailVerified) {
            if (resident.verificationTokenExpiry < Date.now()) {
                await sendVerificationEmail(resident, req);  
                return res.status(403).json({ message: "Your email verification has expired. A new verification link has been sent to your email." });
            }
            // Resend the email in case it's not verified yet but token hasn't expired
            await sendVerificationEmail(resident, req);
            return res.status(403).json({ message: "Please verify your email before logging in. A verification email has been sent." });
        }

        // Generate a token for login
        const token = jwt.sign(
            { id: resident._id, roleinHousehold: 'resident', barangay: resident.barangay },
            process.env.JWT_SECRET,  // Use your JWT secret from environment variables
            { expiresIn: '1h' }
        );

        res.json({ token, user: resident });
    } catch (err) {
        console.error('Error in signInResident:', err);
        res.status(500).json({ message: 'Something went wrong', error: err.message });
    }
};


// Get all residents
const getAllResidents = async (req, res) => {
    try {
        const residents = await Resident.find();
        res.json({ residents });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Get a single resident by ID
const getResidentById = async (req, res) => {
    try {
        const resident = await Resident.findById(req.params.id).populate('householdID');
        if (!resident) {
            return res.status(404).json({ message: 'Resident not found' });
        }
        res.json(resident);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};



// Update a resident by ID
const updateResidentById = async (req, res) => {
    try {
        const { password, ...rest } = req.body;
        if (password) {
            rest.password = password;  // Directly use the plain password
        }
        const resident = await Resident.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true });
        if (!resident) {
            return res.status(404).json({ message: 'Resident not found' });
        }
        res.json({ resident, message: 'Resident updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Delete a resident by ID
const deleteResidentById = async (req, res) => {
    try {
        const resident = await Resident.findByIdAndDelete(req.params.id);
        if (!resident) {
            return res.status(404).json({ message: 'Resident not found' });
        }
        res.json({ resident, message: 'Resident deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

const verifyEmail = async (req, res) => {
    try {
        // Extract the token from the URL parameters
        const token = req.params.token;

        // Verify the token using the JWT secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the resident based on the decoded token's ID
        const resident = await Resident.findById(decoded.id);

        // If no resident is found, or the token does not match, return an error
        if (!resident || resident.verificationToken !== token) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Check if the token has expired
        if (resident.verificationTokenExpiry < Date.now()) {
            return res.status(400).json({ message: 'Verification token has expired' });
        }

        // Set emailVerified to true and clear the token and expiry fields
        resident.emailVerified = true;
        resident.verificationToken = undefined;
        resident.verificationTokenExpiry = undefined;

        // Save the resident after the update
        await resident.save();

        // Send a success response
        res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Error verifying email:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'Verification token has expired' });
        }
        res.status(500).json({ message: 'Error verifying email', error });
    }
};

const resendVerificationEmail = async (req, res) => {
    try {
        const resident = await Resident.findOne({ email: req.body.email });
        if (!resident) {
            return res.status(404).json({ message: 'Resident not found' });
        }

        if (resident.emailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Resend verification email
        await sendVerificationEmail(resident, req, res);
    } catch (error) {
        res.status(500).json({ message: 'Error resending verification email', error });
    }
};



module.exports = {
    addNewResident,
    upload,
    signInResident,
    getAllResidents,
    getResidentById,
    updateResidentById,
    approveResident,
    denyResident,
    deleteResidentById,
    sendVerificationEmail,
    verifyEmail,
    resendVerificationEmail    
};

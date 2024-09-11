const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../../models/admin/adminModel');
const Barangay = require('../../models/barangay/barangayModel');
const Household = require('../../models/resident/householdModel');
const Resident = require('../../models/resident/residentModel'); 
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); 


// Create a Nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
        debug: true, 
    }
});

// Define email options
const mailOptions = {
    from: process.env.GMAIL_USER, 
    to: 'sheynedelacruz@gmai.com', 
    subject: 'Email Verification',
    text: 'This is a test email for verification purposes!',
    html: '<p>Click <a href="your-verification-link">here</a> to verify your email</p>', 
};

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('Error sending email:', error);
    } else {
        console.log('Email sent:', info.response);
    }
});



// Multer setup for profile picture uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/profile_pics';

        // Check if directory exists, if not, create it
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        cb(null, dir); // Set the destination to the uploads/profile_pics folder
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only .png, .jpg, and .jpeg formats are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// Multer setup for valid ID uploads
const validIDStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/valid_ids';

        // Check if directory exists, if not, create it
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const validIDFileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only .pdf, .jpeg, .jpg, and .png formats are allowed!'), false);
    }
};

const uploadValidIDs = multer({
    storage: validIDStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
    fileFilter: validIDFileFilter
});


const sendVerificationEmail = async (user, req) => {
    try {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        user.verificationToken = token;
        user.verificationTokenExpiry = Date.now() + 3600000; // 1-hour expiration
        await user.save();

        const verificationLink = `${req.protocol}://${req.get('host')}/api/admin/verify/${token}`;
        console.log(verificationLink);
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: user.email,
            subject: 'Email Verification - Please do not reply to this email',
            html: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Error sending email');
    }
};

const addNewAdmin = async (req, res) => {
    try {
        upload.single('profilepic')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ message: err.message });
            } else if (err) {
                return res.status(400).json({ message: err.message });
            }

            uploadValidIDs.array('validIDs', 10)(req, res, async function (err) {
                if (err instanceof multer.MulterError) {
                    return res.status(400).json({ message: err.message });
                } else if (err) {
                    return res.status(400).json({ message: err.message });
                }

                const {
                    email,
                    password,
                    firstName,
                    middleName,
                    lastName,
                    suffix,
                    birthday,
                    birthplace,
                    nationality,
                    sex,
                    permanentAddress, 
                    presentAddress, 
                    civilStatus,
                    occupation,
                    roleinBarangay,
                    roleinHousehold,  // Ensure this field is included
                    householdID, // Added for the case of household member
                    religion,
                    indigent,
                    fourpsmember,
                    soloparent,
                    pwd,
                    soloparentid_num,
                    pwdid_num,
                    seniorCitizen,
                    seniorcitizenid_num,
                    philsys_num,
                    voters_id,
                    sss_num,
                    pagibig_num,
                    philhealth_num,
                    tin_num,
                    contactNumber
                } = req.body;

                // Check required fields
                if (!email || !password || !firstName || !lastName || !birthday || !birthplace || !nationality || !sex || !permanentAddress || !civilStatus || !occupation || !roleinBarangay || !contactNumber) {
                    return res.status(400).json({ message: 'Missing required fields' });
                }

                // Check if permanentAddress has required subfields
                if (!permanentAddress.street || !permanentAddress.houseNo) {
                    return res.status(400).json({ message: 'Permanent address is missing required fields (street and houseNo)' });
                }

                // Check if the admin already exists
                const existingAdmin = await Admin.findOne({ email });
                if (existingAdmin) {
                    return res.status(400).json({ message: 'Admin with this email already exists' });
                }

                // Fetch a barangay to associate with the new admin
                const barangay = await Barangay.findOne();
                if (!barangay) {
                    return res.status(404).json({ message: 'No barangay found' });
                }

                // Ensure first admin is Barangay Captain
                const anyAdminExists = await Admin.countDocuments();
                if (!anyAdminExists && roleinBarangay !== 'Barangay Captain') {
                    return res.status(403).json({ message: 'The first admin must be the Barangay Captain' });
                }

                // Restrict certain roles
                if (['Secretary', 'Kagawad'].includes(roleinBarangay) && req.user.roleinBarangay !== 'Barangay Captain') {
                    return res.status(403).json({ message: 'Only a Barangay Captain can assign Secretary or Kagawad roles' });
                }

                // Save profile picture if uploaded
                const profilePicPath = req.file ? req.file.path : null;

                // Save valid ID file paths
                const validIDFilePaths = req.files ? req.files.map(file => file.path) : [];

                // Create the new admin
                const newAdmin = new Admin({
                    email,
                    password,
                    firstName,
                    middleName,
                    lastName,
                    suffix,
                    barangay: barangay._id,
                    birthday,
                    birthplace,
                    nationality,
                    sex,
                    permanentAddress, 
                    presentAddress,
                    civilStatus,
                    occupation,
                    roleinBarangay,
                    roleinHousehold,
                    religion,
                    indigent,
                    fourpsmember,
                    soloparent,
                    pwd,
                    soloparentid_num,
                    pwdid_num,
                    seniorCitizen,
                    seniorcitizenid_num,
                    philsys_num,
                    voters_id,
                    sss_num,
                    pagibig_num,
                    philhealth_num,
                    tin_num,
                    contactNumber,
                    profilepic: profilePicPath, 
                    validIDs: validIDFilePaths 
                });

                // Assign the admin to the correct role in the barangay
                if (roleinBarangay === 'Barangay Captain') {
                    barangay.barangayCaptain = newAdmin._id;
                } else if (roleinBarangay === 'Secretary') {
                    barangay.barangaySecretary = newAdmin._id;
                } else if (roleinBarangay === 'Kagawad') {
                    barangay.barangayKagawad.push(newAdmin._id); // Assuming multiple Kagawads
                }

                // Save the updated barangay
                await barangay.save();

                // Create the corresponding resident account
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
                    nationality,
                    sex,
                    permanentAddress, 
                    presentAddress,
                    civilStatus,
                    occupation,
                    roleinBarangay: 'Resident',  // Fixed role for resident
                    roleinHousehold,
                    religion,
                    indigent,
                    fourpsmember,
                    soloparent,
                    pwd,
                    soloparentid_num,
                    pwdid_num,
                    seniorCitizen,
                    seniorcitizenid_num,
                    philsys_num,
                    voters_id,
                    sss_num,
                    pagibig_num,
                    philhealth_num,
                    tin_num,
                    contactNumber,
                    profilepic: profilePicPath, 
                    validIDs: validIDFilePaths 
                });

                // Save both the admin and resident accounts
                await Promise.all([newAdmin.save(), newResident.save()]);

                // Send verification email for the new admin
                await sendVerificationEmail(newAdmin, req);

                // Case 1: Create a household if the resident is the head of the household
                if (roleinHousehold === 'Household Head') {
                    const maxHousehold = await Household.findOne().sort('-householdID').exec();
                    const householdID = maxHousehold ? maxHousehold.householdID + 1 : 1;

                    const newHousehold = new Household({
                        householdID,
                        householdHead: newResident._id,
                        contactNumber: newResident.contactNumber,
                        members: [newResident._id],
                    });

                    await newHousehold.save();

                    // Update the resident's householdID
                    newResident.householdID = newHousehold._id;
                    await newResident.save();
                }

                // Case 2: Add to an existing household if the resident is a family member
                if (roleinHousehold === 'Household Member' && householdID) {
                    const household = await Household.findOne({ householdID });

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

                res.status(201).json({ newAdmin, newResident, message: "Successfully added a new admin, resident account, and household (if applicable)." });
            });
        });
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong', error: err.message });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const token = req.params.token;

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the admin by decoded token's ID
        const admin = await Admin.findById(decoded.id);

        if (!admin || admin.verificationToken !== token) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Check if the token has expired
        if (admin.verificationTokenExpiry < Date.now()) {
            return res.status(400).json({ message: 'Verification token has expired' });
        }

        // Mark the email as verified
        admin.emailVerified = true;
        admin.verificationToken = undefined;
        admin.verificationTokenExpiry = undefined;

        await admin.save();
        res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({ message: 'Error verifying email', error });
    }
};

const resendVerificationEmail = async (req, res) => {
    try {
        const admin = await Admin.findOne({ email: req.body.email });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        if (admin.emailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Resend verification email
        await sendVerificationEmail(admin, req);
        res.status(200).json({ message: 'Verification email resent' });
    } catch (error) {
        res.status(500).json({ message: 'Error resending verification email', error });
    }
};



// Find all admins
const findAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find().populate('barangay');
        res.json({ admins });
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong', error: err });
    }
};

// Sign in admin
const signInAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email }).populate('barangay');

        // Check if the admin exists
        if (!admin) {
            return res.status(401).json({ message: "Incorrect email" });
        }

        // Check if the password is correct
        if (password !== admin.password) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        // If the email is not verified, resend verification email
        if (!admin.emailVerified) {
            await sendVerificationEmail(admin, req);  // Resend verification email
            return res.status(403).json({ 
                message: "Your email is not verified. A new verification email has been sent to your inbox." 
            });
        }

        // Generate a token for login
        const token = jwt.sign(
            { id: admin._id, roleinBarangay: admin.roleinBarangay, barangay: admin.barangay._id },
            process.env.JWT_SECRET,  // Use your JWT secret from the environment variables
            { expiresIn: '1h' }
        );

        res.json({ token, user: admin });
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong', error: err.message });
    }
};


// Find admin by email
const findAdminByEmail = async (req, res) => {
    try {
        const admin = await Admin.findOne({ email: req.params.email });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json({ admin });
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong', error: err });
    }
};

// Delete admin by ID
const deleteAdminById = async (req, res) => {
    try {
        const adminToDelete = await Admin.findById(req.params.id);
        if (!adminToDelete) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        await Admin.findByIdAndDelete(req.params.id);
        res.json({ message: "Successfully deleted the admin" });
    } catch (err) {
        res.status (500).json({ message: 'Something went wrong', error: err });
    }
};

// Update admin
const updateAdmin = async (req, res) => {
    try {
        const adminToUpdate = await Admin.findById(req.params.id);
        if (!adminToUpdate) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const updatedAdmin = await Admin.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json({ updatedAdmin, message: "Admin updated successfully" });
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong', error: err });
    }
};

// Find admin by ID
const getAdminById = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);  // No population
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.status(200).json(admin);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    findAllAdmins,
    signInAdmin,
    findAdminByEmail,
    deleteAdminById,
    addNewAdmin,
    updateAdmin,
    getAdminById,
    resendVerificationEmail,
    verifyEmail,
    sendVerificationEmail,
    upload, 
    uploadValidIDs
};

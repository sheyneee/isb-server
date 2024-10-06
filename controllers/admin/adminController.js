const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../../models/admin/adminModel');
const Barangay = require('../../models/barangay/barangayModel');
const Household = require('../../models/resident/householdModel');
const Resident = require('../../models/resident/residentModel'); 
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const nodemailer = require('nodemailer');
const multer = require('multer');
require('dotenv').config(); 
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt'); // Add this at the top


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

// AWS S3 setup
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Helper function to upload files to S3
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

// Combined upload middleware for both profilepic and validIDs
const uploadFiles = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = {
            profilepic: ['image/png', 'image/jpeg', 'image/jpg'],
            validIDs: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
        };

        if (allowedFileTypes[file.fieldname] && allowedFileTypes[file.fieldname].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type for ${file.fieldname}.`));
        }
    },
}).fields([
    { name: 'profilepic', maxCount: 1 },
    { name: 'validIDs', maxCount: 10 }
]);


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

        // Check for profilepic and upload to S3 if available
        let profilepicUrl = '';
        if (req.files && req.files.profilepic && req.files.profilepic.length > 0) {
            profilepicUrl = await uploadToS3(req.files.profilepic[0], 'admin/profilepics');
        }

        // Check for validIDs and upload to S3 if available
        let validIDUrls = [];
        if (req.files && req.files.validIDs && req.files.validIDs.length > 0) {
            validIDUrls = await Promise.all(
                req.files.validIDs.map(file => uploadToS3(file, 'admin/validids'))
            );
        }

        // Extract other fields from req.body
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
            roleinHousehold,
            householdID,
            reltohouseholdhead,  
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

                if (!email || !password || !firstName || !lastName || !birthday || !birthday || !birthplace || !nationality || !sex || !permanentAddress || !civilStatus ||
                    !occupation || 
                    !roleinBarangay || 
                    !roleinHousehold || !religion || !contactNumber) {
                    return res.status(400).json({ message: 'Missing required fields' });
                }   

                // Hash the password before saving it
                const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10

                // Validate if reltohouseholdhead is required when roleinHousehold is "Household Member"
                if (roleinHousehold === 'Household Member' && !reltohouseholdhead) {
                    return res.status(400).json({ message: 'Relationship to household head is required for Household Member' });
                }
            
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

                // Ensure there is only one Barangay Captain
                if (roleinBarangay === 'Barangay Captain') {
                    const existingCaptain = await Admin.findOne({ roleinBarangay: 'Barangay Captain', barangay: barangay._id });
                    if (existingCaptain) {
                        return res.status(400).json({ message: 'A Barangay Captain already exists for this barangay.' });
                    }
                }
                    // Create the new admin
                    const newAdmin = new Admin({
                        email,
                        password: hashedPassword,
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
                        reltohouseholdhead,
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
                        profilepic: profilepicUrl,
                        validIDs: validIDUrls
                    });

                // Assign the admin to the correct role in the barangay
                if (roleinBarangay === 'Barangay Captain') {
                    barangay.barangayCaptain = newAdmin._id;
                } else if (roleinBarangay === 'Secretary') {
                    barangay.barangaySecretary = newAdmin._id;
                } else if (roleinBarangay === 'Kagawad') {
                    barangay.barangayKagawad.push(newAdmin._id);
                }

                // Save the updated barangay
            await barangay.save();

            // Hash the password for the resident account
            const hashedResidentPassword = await bcrypt.hash(password, 10); // Hash the resident password

            // Create the corresponding resident account
            const newResident = new Resident({
                email,
                password: hashedResidentPassword,
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
                roleinBarangay: 'Resident',
                roleinHousehold,
                reltohouseholdhead,  
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
                profilepic: profilepicUrl,
                validIDs: validIDUrls
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

            res.status(201).json({ message: "Successfully added a new admin." });
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
        return res.redirect('http://localhost:3000/?verified=true');
        
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

        // Compare the hashed password with the password entered by the user
        const isPasswordCorrect = await bcrypt.compare(password, admin.password);
        if (!isPasswordCorrect) {
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

const updateAdmin = async (req, res) => {
    try {
        // Find the admin to update
        const adminToUpdate = await Admin.findById(req.params.id);
        if (!adminToUpdate) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Get the profile picture URL if a new picture is uploaded
        let profilepicUrl = adminToUpdate.profilepic; // Preserve existing URL
        if (req.files && req.files.profilepic && req.files.profilepic.length > 0) {
            profilepicUrl = await uploadToS3(req.files.profilepic[0], 'admin/profilepics');
        }

        // Get the valid IDs URLs if new files are uploaded, or preserve the existing ones
        let validIDUrls = adminToUpdate.validIDs; // Preserve existing valid ID URLs
        if (req.files && req.files.validIDs && req.files.validIDs.length > 0) {
            validIDUrls = await Promise.all(
                req.files.validIDs.map(file => uploadToS3(file, 'admin/validids'))
            );
        }

        // Extract other fields from req.body
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
            contactNumber
        } = req.body;

        // Update only fields that are provided in the request
        const updateData = {
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
            profilepic: profilepicUrl, // Use the new URL if uploaded, or the existing one
            validIDs: validIDUrls, // Use the new URLs if uploaded, or the existing ones
            updated_at: Date.now(),
        };

        // Remove any undefined fields from updateData
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        // Update the admin's information
        const updatedAdmin = await Admin.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        });
        
        console.log('Received files:', req.files);
        console.log('Received body:', req.body);

        res.status(200).json({ updatedAdmin, message: "Admin updated successfully." });
    } catch (err) {
        console.error('Error in updateAdmin:', err);
        res.status(500).json({ message: 'Something went wrong', error: err.message });
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

// Forgot Password function
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found with this email' });
        }

        // Generate a 6-digit random number as reset code
        const resetCode = crypto.randomInt(100000, 999999).toString();

        // Set the reset token and expiry (1 hour from now)
        admin.resetPasswordToken = resetCode;
        admin.resetPasswordExpiry = Date.now() + 3600000; // 1 hour expiration
        await admin.save();

        // Send email with the reset code
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: admin.email,
            subject: 'Password Reset Code',
            html: `<p>Your password reset code is: <strong>${resetCode}</strong></p>
                   <p>This code will expire in 1 hour.</p>`
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ message: 'Reset code sent to email' });
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Reset Password function
const resetPassword = async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Check if the reset code matches and is still valid (not expired)
        if (admin.resetPasswordToken !== resetCode || admin.resetPasswordExpiry < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        // Validate the new password strength
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        // List of weak passwords
        const weakPasswords = ['123456', 'password', '123456789', '12345678', 'qwerty', 'abc123', '111111'];
        if (weakPasswords.includes(newPassword.toLowerCase())) {
            return res.status(400).json({ message: 'Please choose a more secure password.' });
        }

        // Hash the new password before saving it
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update the password and clear the reset token and expiry
        admin.password = hashedNewPassword;
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpiry = undefined;

        await admin.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).json({ message: 'Something went wrong', error });
    }
};


// Verify Security Code function
const verifySecurityCode = async (req, res) => {
    try {
        const { email, securityCode } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Check if the security code matches and hasn't expired
        if (admin.resetPasswordToken !== securityCode || admin.resetPasswordExpiry < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired security code' });
        }

        res.status(200).json({ message: 'Security code verified successfully' });
    } catch (error) {
        console.error('Error in verifySecurityCode:', error);
        res.status(500).json({ message: 'Something went wrong', error });
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
    uploadFiles,
    forgotPassword,
    resetPassword,
    verifySecurityCode,
};

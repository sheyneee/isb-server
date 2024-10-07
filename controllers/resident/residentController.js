const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Resident = require('../../models/resident/residentModel');
const Barangay = require('../../models/barangay/barangayModel');
const Household = require('../../models/resident/householdModel');
const Admin = require('../../models/admin/adminModel');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
require('dotenv').config(); // Load environment variables
const crypto = require('crypto');
const bcrypt = require('bcrypt');

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


// AWS S3 setup for v3
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Multer setup for in-memory storage with file type validation
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        // Define allowed file types for each field
        const allowedFileTypes = {
            profilepic: ['image/png', 'image/jpeg', 'image/jpg'],
            validIDs: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
        };

        // Check if the file field name is in allowedFileTypes and if the mimetype is allowed
        if (allowedFileTypes[file.fieldname] && allowedFileTypes[file.fieldname].includes(file.mimetype)) {
            cb(null, true); // Accept the file
        } else {
            cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${allowedFileTypes[file.fieldname].join(', ')}`));
        }
    }
}).fields([
    { name: 'profilepic', maxCount: 1 },
    { name: 'validIDs', maxCount: 10 }
]);


// Helper function to upload a file to S3 using AWS SDK v3
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
        // Return the URL of the uploaded file
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error('File upload to S3 failed.');
    }
};


// Add new resident
const addNewResident = async (req, res) => {
    try {
        if (Array.isArray(req.body.reltohouseholdhead)) {
            req.body.reltohouseholdhead = req.body.reltohouseholdhead[0];  // Use the first element if it's an array
        }
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
            reltohouseholdhead,
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

        // Upload profile picture to S3 (if present)
        let profilepicUrl = '';
        if (req.files && req.files.profilepic) {
            profilepicUrl = await uploadToS3(req.files.profilepic[0], 'resident/profilepic');
        }

        // Upload valid IDs to S3 (if present)
        let validIDUrls = [];
        if (req.files && req.files.validIDs) {
            validIDUrls = await Promise.all(
                req.files.validIDs.map(file => uploadToS3(file, 'resident/validid'))
            );
        }

        // Check for missing required fields
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
        if (email) {
            const existingResident = await Resident.findOne({ email });
            if (existingResident) {
                return res.status(400).json({ message: 'Resident with this email already exists' });
            }
        }

        // Fetch the barangay information
        const barangay = await Barangay.findOne();
        if (!barangay) {
            return res.status(404).json({ message: 'No barangay found' });
        }

        // Create password if email is provided
        let password;
        if (email) {
            const currentYear = new Date().getFullYear();
            const sanitizedLastName = lastName.replace(/\s+/g, '').toLowerCase();
            password = `${currentYear}${sanitizedLastName}${firstName.charAt(0).toLowerCase()}${middleName ? middleName.charAt(0).toLowerCase() : ''}`;

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            const newResident = new Resident({
                email,
                password: hashedPassword,  // Use the hashed password
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
                reltohouseholdhead,
                roleinBarangay: 'Resident',
                profilepic: profilepicUrl, // Save profile picture URL
                validIDs: validIDUrls, // Save valid ID URLs
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

            // Send verification email if email is provided
            if (email) {
                await sendVerificationEmail(newResident, req);
            }

            // Send success response with newResident object
            if (!res.headersSent) {
                return res.status(201).json({ newResident, message: 'Resident added successfully.' });
            }
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

        // Update the resident status to 'Approved'
        resident.accountStatus = 'Approved';
        resident.approvedBy = req.user.id; // Ensure req.user.id is properly populated
        await resident.save();

        // Update barangay details if resident is approved
        const barangay = await Barangay.findById(resident.barangay);
        if (barangay) {
            // Increment population
            barangay.population += 1;

            // Increment the count for each specific attribute if true and resident is approved
            if (resident.voter) barangay.totalvoters += 1;
            if (resident.indigent) barangay.totalindigent += 1;
            if (resident.fourpsmember) barangay.total4psbeneficiary += 1;
            if (resident.soloparent) barangay.totalsoloparent += 1;
            if (resident.pwd) barangay.totalpwd += 1;
            if (resident.seniorCitizen) barangay.totalseniorcitizen += 1;

            await barangay.save();
        } else {
            return res.status(404).json({ message: 'Barangay not found' });
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
            return res.status(404).json({ message: "User doesn't exist" });
        }

         // Check if the password is correct using bcrypt.compare
         const isPasswordValid = await bcrypt.compare(password, resident.password);
         if (!isPasswordValid) {
             return res.status(401).json({ message: "Incorrect email or password" });
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
            rest.password = password;  
        }

        // Handle file upload
        let profilepicUrl = '';
        if (req.files && req.files.profilepic) {
            profilepicUrl = await uploadToS3(req.files.profilepic[0], 'resident/profilepic');
            rest.profilepic = profilepicUrl; // Include profile picture URL in the update
        }

        // Update the resident's information in the database
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

        return res.redirect('http://iservebarangay.com/?verified=true');

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

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const resident = await Resident.findOne({ email });

        if (!resident) {
            return res.status(404).json({ message: 'Resident not found with this email' });
        }

        // Generate a 6-digit random number
        const resetCode = crypto.randomInt(100000, 999999).toString();

        // Set the reset token and expiry (1 hour from now)
        resident.resetPasswordToken = resetCode;
        resident.resetPasswordExpiry = Date.now() + 3600000; // 1 hour expiration
        await resident.save();

        // Send email with the reset code
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: resident.email,
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

const resetPassword = async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;

        // Find the resident using email
        const resident = await Resident.findOne({ email });

        if (!resident) {
            return res.status(404).json({ message: 'Resident not found' });
        }

        // Check if the reset code matches and if it's still valid (not expired)
        if (resident.resetPasswordToken !== resetCode || resident.resetPasswordExpiry < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        // Validate password strength
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        const weakPasswords = ['123456', 'password', '123456789', '12345678', 'qwerty', 'abc123', '111111'];
        if (weakPasswords.includes(newPassword.toLowerCase())) {
            return res.status(400).json({ message: 'Please choose a more secure password.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10); // Salt rounds = 10

        // Update the password and clear the reset token and expiry
        resident.password = hashedPassword;
        resident.resetPasswordToken = undefined;
        resident.resetPasswordExpiry = undefined;

        // Save the updated resident record
        await resident.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).json({ message: 'Something went wrong', error });
    }
};


const verifySecurityCode = async (req, res) => {
    try {
        const { email, securityCode } = req.body;

        // Find the resident by email
        const resident = await Resident.findOne({ email });

        if (!resident) {
            return res.status(404).json({ message: 'Resident not found' });
        }

        // Check if the security code matches and hasn't expired
        if (resident.resetPasswordToken !== securityCode || resident.resetPasswordExpiry < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired security code' });
        }

        res.status(200).json({ message: 'Security code verified successfully' });
    } catch (error) {
        console.error('Error in verifySecurityCode:', error);
        res.status(500).json({ message: 'Something went wrong', error });
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
    resetPassword,
    forgotPassword,
    sendVerificationEmail,
    verifyEmail,
    resendVerificationEmail,
    verifySecurityCode    
};

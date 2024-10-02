const mongoose = require('mongoose');
const moment = require('moment');

const residentSchema = new mongoose.Schema({
    residentID: {
        type: String,
        unique: true
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true
    },
    householdID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Household'
    },
    password: {
        type: String,
    },
    profilepic: String,
    firstName: {
        type: String,
        required: [true, 'First name is required']
    },
    middleName: String,
    suffix: {
        type: String,
    },               
    lastName: {
        type: String,
        required: [true, 'Last Name is required']
    },
    barangay: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Barangay',
        required: [true, 'Barangay is required']
    },
    birthday: {
        type: Date,
        required: [true, 'Birthday is required']
    },
    birthplace: {
        type: String,
        required: [true, 'Birthplace is required']
    },
    age: Number,
    sex: {
        type: String,
        required: [true, 'Sex is required'],
        enum: ['Male', 'Female']
    },
    contactNumber: {
        type: String,
    },
    permanentAddress: {
        street: {
            type: String,
            required: [true, 'Street is required']
        },
        unitFloorRoomNo: String,
        building: String,
        blockNo: String,
        lotNo: String,
        phaseNo: String,
        houseNo: {
            type: String,
            required: [true, 'House No. is required']
        },
        subdivision: String
    },
    presentAddress: {
        street: {
            type: String,
        },
        unitFloorRoomNo: String,
        building: String,
        blockNo: String,
        lotNo: String,
        phaseNo: String,
        houseNo: {
            type: String,
        },
        subdivision: String,
        barangay: String,
        city: String,
        province: String,
        region: String,
        postalcode: String,
    },
    nationality: {
        type: String,
        required: [true, 'Nationality is required']
    },
    religion: String,
    occupation: String,
    civilStatus: {
        type: String,
        required: [true, 'Civil Status is required'],
        enum: ['Single', 'Married', 'Separated', 'Divorced', 'Widowed', 'Annulled']
    },
    roleinBarangay: { 
        type: String, 
        required: true, 
        enum: ['Resident'] 
    },
    roleinHousehold: {
        type: String,
        required: [true, 'Role is required'],
        enum: ['Household Head', 'Household Member']
    },
    reltohouseholdhead: {
        type: String, 
        validate: {
            validator: function (value) {
                if (this.roleinHousehold === 'Household Member' && !value) {
                    return false;
                }
                return true;
            },
            message: 'Relationship to household head is required for household members.'
        }
    },  
    voter: {
        type: Boolean,
        default: false
    },
    indigent: {
        type: Boolean,
        default: false
    },
    fourpsmember: {
        type: Boolean,
        default: false
    },
    soloparent: {
        type: Boolean,
        default: false
    },
    pwd: {
        type: Boolean,
        default: false
    },
    seniorCitizen: {
        type: Boolean,
        default: false
    },
    soloparentid_num: String,
    pwdid_num: String,
    seniorcitizenid_num: String,
    philsys_num: String,
    voters_id: String,
    sss_num: String,
    pagibig_num: String,
    philhealth_num: String,
    tin_num: String,
    validIDs: {
        type: [String], 
        default: []
    },
    lastLogin: Date,
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    accountStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Denied'],
        default: 'Pending'
    },
    remarks:{
        type: String,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String
    },
    verificationTokenExpiry: {
        type: Date
    }
});

// Pre-save middleware to handle the assignment of barangay, residentID, and dynamic age calculation
residentSchema.pre('save', async function (next) {
    try {
        if (this.isNew) {
            // Lazy load Barangay and Household models to avoid circular dependency
            const Barangay = require('../barangay/barangayModel');
            const Household = require('./householdModel'); // Lazy-loaded here

            // Assign Barangay (similar to previous)
            const barangay = await Barangay.findOne();
            if (!barangay) {
                return next(new Error('No Barangay found to assign'));
            }
            this.barangay = barangay._id;

            // Assign Household if it's present
            if (this.householdID) {
                const household = await Household.findById(this.householdID);
                if (!household) {
                    return next(new Error('No Household found with the given ID'));
                }
            }

            // ResidentID generation logic
            const currentYear = new Date().getFullYear();
            const latestResident = await this.constructor.findOne({
                residentID: new RegExp(`^R-${currentYear}-\\d{4}$`)
            }).sort({ residentID: -1 }).exec();

            let newIncrement;
            if (latestResident) {
                const lastIncrement = parseInt(latestResident.residentID.split('-')[2], 10);
                newIncrement = lastIncrement + 1;
            } else {
                newIncrement = 1;
            }

            const incrementString = String(newIncrement).padStart(4, '0');
            this.residentID = `R-${currentYear}-${incrementString}`;
        }

        // Age calculation
        const now = moment();
        const birthDate = moment(this.birthday);
        this.age = now.diff(birthDate, 'years');
        this.seniorCitizen = this.age >= 60;

        next();
    } catch (error) {
        next(error);
    }
});

// Pre-update middleware to handle dynamic age calculation on update
residentSchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate();
    if (update.$set && update.$set.birthday) {
        const now = moment();
        const birthDate = moment(update.$set.birthday);
        const age = now.diff(birthDate, 'years');
        update.$set.age = age;
        update.$set.seniorCitizen = age >= 60;
    }
    next();
});

const Resident = mongoose.model('Resident', residentSchema);
module.exports = Resident;

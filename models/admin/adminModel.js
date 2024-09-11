const mongoose = require('mongoose');
const Barangay = require('../barangay/barangayModel');
const Household = require('../resident/householdModel');
const moment = require('moment');

const adminSchema = new mongoose.Schema({
    adminID: { 
        type: Number, 
        unique: true 
    },
    profilepic: String,
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true, 
        lowercase: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    householdID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Household'
    },
    firstName: { 
        type: String, 
        required: true 
    },
    middleName: String,
    suffix: {
        type: String,
    },   
    lastName: { 
        type: String, 
        required: true 
    },
    barangay: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Barangay', 
        required: true 
    },
    birthday: { 
        type: Date, 
        required: [true, 'Birthday is required'] 
    },
    birthplace: {
        type: String,
        required: [true, 'Birthplace is required']
    },
    age: { 
        type: Number 
    },
    sex: { 
        type: String, 
        required: true, 
        enum: ['Male', 'Female'] 
    },
    contactNumber: {
        type: String,
        required: [true, 'Contact Number is required']
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
        subdivision: String
    },
    nationality: { 
        type: String, 
        required: [true, 'Nationality is required'] 
    },
    religion: String,
    occupation: { 
        type: String, 
        required: true 
    },
    civilStatus: {
        type: String,
        required: [true, 'Civil Status is required'],
        enum: ['Single', 'Married', 'Separated', 'Divorced', 'Widowed', 'Annulled']
    },
    roleinBarangay: { 
        type: String, 
        required: true, 
        enum: ['Barangay Captain', 'Secretary', 'Kagawad'] 
    },
    roleinHousehold: {
        type: String,
        required: [true, 'Role is required'],
        enum: ['Household Head', 'Household Member']
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

adminSchema.pre('save', async function(next) {
    try {
        if (this.isNew) {
            const barangay = await Barangay.findOne();
            if (!barangay) {
                return next(new Error('No Barangay found to assign'));
            }
            this.barangay = barangay._id;
            const maxAdmin = await this.constructor.findOne().sort('-adminID').exec();
            this.adminID = maxAdmin ? maxAdmin.adminID + 1 : 1;
        }

        const now = moment();
        const birthDate = moment(this.birthday);
        this.age = now.diff(birthDate, 'years');
        this.seniorCitizen = this.age >= 60;

        next();
    } catch (error) {
        next(error);
    }
});

adminSchema.pre('findOneAndUpdate', async function(next) {
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

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
const mongoose = require('mongoose');
const Admin = require('../admin/adminModel')

const barangaySchema = new mongoose.Schema({
    barangayName: {
        type: String,
        required: [true, 'Barangay Name is required'],
 
    },
    region: {
        type: String,
        required: [true, 'Region is required'],
 
    },
    email:{
        type: String
    },
    logo:{
    type: String
    },
    contactnumber:{
        type: String
    },
    province: {
        type: String,
        required: [true, 'Province'],

    },
    municipality: {
        type: String,
        required: [true, 'City is required'],

    },
    postalcode: {
        type: Number,
        required: [true, 'Postal Code is required'],

    },
    location:{
        type: String,
        default: '', 
    },
    history:{
        type: String,
        default: '', 
    },
    barangayCaptain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null  
    },
    barangaySecretary: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null  
    },
    barangayKagawad: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: []
    }],
    population: {
        type: Number,
        default: 0,
        min: [0, 'Population cannot be negative']
    },
    totalpwd:{
        type: Number,
        default: 0,
        min: [0, 'PWD cannot be negative']
    },
    totalvoters:{
        type: Number,
        default: 0,
        min: [0, 'Voters cannot be negative']
    },
    totalindigent:{
        type: Number,
        default: 0,
        min: [0, 'Indigent cannot be negative']
    },
    totalseniorcitizen:{
        type: Number,
        default: 0,
        min: [0, 'Senior Citizen cannot be negative']
    },
    totalsoloparent:{
        type: Number,
        default: 0,
        min: [0, 'Solo Parent cannot be negative']
    },
    total4psbeneficiary:{
        type: Number,
        default: 0,
        min: [0, '4ps Beneficiary cannot be negative']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

const Barangay = mongoose.model('Barangay', barangaySchema);

module.exports = Barangay;

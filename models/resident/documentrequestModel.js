const mongoose = require('mongoose');
const Barangay = require('../barangay/barangayModel');
const Resident= require('../../models/resident/residentModel');
const Admin = require('../admin/adminModel')

const documentRequestSchema = new mongoose.Schema({
    requestedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        refPath: 'requestedByType'  
    },
    requestedByType: {
        type: String,
        required: true,
        enum: ['Resident', 'Admin'] 
    },
    ReferenceNo:{
        type: String, 
        unique: true,
        required: true
    },
    residentName: { 
        type: String, 
        required: true 
    },
    recipient:{
        type: String,
    },
    documentType: { 
        type: String,
        required: true 
    },
    purpose: { 
        type: String, 
        required: true 
    },
    ValidID: {
        type: [{
            originalname: { type: String, required: true },
            mimetype: { type: String, required: true },
            url: { type: String, required: true } 
        }],
        default: []
    },
    status:{
        type: String,
        enum: ['Pending', 'Denied','Processing','Ready to Pickup','Released'],
        default: 'Pending'
    },
    remarks: {
        type: String
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
});

const DocumentRequest = mongoose.model('DocumentRequest', documentRequestSchema);
module.exports = DocumentRequest;

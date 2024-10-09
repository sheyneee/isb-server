const mongoose = require('mongoose');
const Resident= require('../../models/resident/residentModel');
const Admin = require('../admin/adminModel')
const Barangay = require('../barangay/barangayModel');

const incidentReportSchema = new mongoose.Schema({
    complainantID: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        refPath: 'complainantByType'  
    },
    complainantByType: {
        type: String,
        required: true,
        enum: ['Resident', 'Admin'] 
    },
    ReferenceNo:{
        type: String, 
        unique: true,
        required: true
    },
    complainantname:{
        type: [String],
    },
    respondentname:{
        type: [String],
    },
    typeofcomplaint: { 
        type: String,
        required: true 
    },
    incidentdescription:{
        type: String,
        required: true
    },
    relieftobegranted:{
        type:String,
        required: true
    },
    dateAndTimeofIncident:{
        type: Date
    },
    Attachment: {
        type: [{
            originalname: { type: String, required: true },
            mimetype: { type: String, required: true },
            url: { type: String, required: true } 
        }],
        default: []
    },
    status:{
        type: String,
        enum: ['Pending', 'Active','Processing ','Verified','Settled', 'Archived'],
        default: 'Pending'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    archived_at: {
        type: Date,
        default: null 
    },
});

// Pre-save middleware to handle 'archived_at' updates
incidentReportSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        if (this.status === 'Archived') {
            this.archived_at = new Date();
        } else if (this.status === 'Active') {
            this.archived_at = null; // Reset the countdown if status changes back to Active
        }
    }
    next();
});

// Virtual field for days until deletion
incidentReportSchema.virtual('daysUntilDeletion').get(function () {
    if (this.status !== 'Archived' || !this.archived_at) {
        return null;
    }
    const now = new Date();
    const deletionDate = new Date(this.archived_at);
    deletionDate.setDate(deletionDate.getDate() + 90);
    const daysLeft = Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
});

const IncidentReport = mongoose.model('IncidentReport', incidentReportSchema);
module.exports = IncidentReport;

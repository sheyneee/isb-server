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
    complainantname:{
        type: String,
    },
    typeofcomplaint: { 
        type: String,
        required: true 
    },
    incidentdescription:{
        type: String,
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
        enum: ['Pending', 'Active','Schedules','Settled'],
        default: 'Pending'
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

const IncidentReport = mongoose.model('IncidentReport', incidentReportSchema);
module.exports = IncidentReport;

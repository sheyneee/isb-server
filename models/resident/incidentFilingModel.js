const mongoose = require('mongoose');

const incidentReportSchema = new mongoose.Schema({
    residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
    typeOfComplaint: { 
        type: String, 
        enum: ['Utility Interruptions', 'Noise Complaint', 'Public Disturbance', 'Waste Management', 'Others'],
        required: true 
    },
    title: { type: String, required: true },
    incidentDate: { type: Date, required: true },
    description: { type: String, required: true },
    attachments: [{ type: String, required: true }], 
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

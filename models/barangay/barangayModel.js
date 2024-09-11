const mongoose = require('mongoose');
const Admin = require('../admin/adminModel')

const barangaySchema = new mongoose.Schema({
    barangayName: {
        type: String,
        required: [true, 'Barangay Name is required'],
        default: '52 - IPIL', 
        immutable: true 
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        default: 'Cavite City', 
        immutable: true 
    },
    postalcode: {
        type: Number,
        required: [true, 'Postal Code is required'],
        default: 4100, 
        immutable: true 
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

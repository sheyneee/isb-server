const mongoose = require('mongoose');
const Resident = require('../../models/resident/residentModel');
const Admin = require('../admin/adminModel')

const householdSchema = new mongoose.Schema({
    householdID: {
        type: String, 
        unique: true,
        required: true
    },
    householdHead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resident',
        required: true
    },
    contactNumber: {
        type: String,
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resident'
    }],
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

householdSchema.pre('save', async function(next) {
    if (this.isNew) {
        const currentYear = new Date().getFullYear();
        
        // Find the latest household for the current year
        const latestHousehold = await this.constructor.findOne({
            householdID: new RegExp(`^${currentYear}-\\d{4}$`)
        }).sort('-householdID').exec();

        if (latestHousehold) {
            // Extract the last four digits and increment by 1
            const latestIdNumber = parseInt(latestHousehold.householdID.split('-')[1]);
            const newIdNumber = latestIdNumber + 1;
            this.householdID = `${currentYear}-${newIdNumber.toString().padStart(4, '0')}`;
        } else {
            // No households for the current year, start with '0001'
            this.householdID = `${currentYear}-0001`;
        }
    }
    next();
});

const Household = mongoose.model('Household', householdSchema);
module.exports = Household;

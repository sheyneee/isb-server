const mongoose = require('mongoose');

const hotlinesSchema = new mongoose.Schema({
    name:{
        type: String,
        required: [true, 'Name is required']
    },
    contactNo:{
        type: String,
        required: [true, 'Contact Number is required']
    },
    photo:{
        type: String,
        required: [true, 'Photo is required']
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

const Hotlines = mongoose.model('Hotlines', hotlinesSchema);

module.exports = Hotlines;

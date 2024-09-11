const mongoose = require('mongoose');
const Admin = require('../../models/admin/adminModel');

const announcementSchema = new mongoose.Schema({
  adminID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  announcementCategory: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: {
    type: String,
    required: false 
  },
  Importance: {
    type: String,
    enum: ['Not Important', 'Important'],
    default: 'Not Important'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
});

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;

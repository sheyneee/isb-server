const express = require('express');
const router = express.Router();
const barangayController = require('../../controllers/barangay/barangayController');

router.get('/all/barangays', barangayController.getAllBarangays);
router.post('/new/barangay', barangayController.createBarangay); 
router.get('/barangay/:id', barangayController.getBarangayById);
router.put('/barangay/:id', barangayController.updateBarangayById);
router.delete('/barangay/:id', barangayController.deleteBarangayById);

module.exports = router;
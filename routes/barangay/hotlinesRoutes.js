const express = require('express');
const router = express.Router();
const hotlinesController = require('../../controllers/barangay/hotlinesController');

router.get('/all/hotlines', hotlinesController.upload, hotlinesController.getAllHotlines);
router.post('/new/barangay', hotlinesController.createHotline); 
router.get('/barangay/:id', hotlinesController.getHotlineById);
router.put('/barangay/:id', hotlinesController.updateHotline);
router.delete('/barangay/:id', hotlinesController.deleteHotline);

module.exports = router;
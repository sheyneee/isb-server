const express = require('express');
const router = express.Router();
const hotlinesController = require('../../controllers/barangay/hotlinesController');

router.get('/all/hotlines', hotlinesController.upload, hotlinesController.getAllHotlines);
router.post('/new/hotlines', hotlinesController.createHotline); 
router.get('/hotlines/:id', hotlinesController.getHotlineById);
router.put('/hotlines/:id', hotlinesController.updateHotline);
router.delete('/hotlines/:id', hotlinesController.deleteHotline);

module.exports = router;
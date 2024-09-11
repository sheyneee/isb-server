const express = require('express');
const router = express.Router();
const documentRequestController = require('../../controllers/resident/documentrequestController');


router.post('/new/document-requests',
    documentRequestController.upload,  
    documentRequestController.createDocumentRequest
);

router.put('/document-requests/:id',
  documentRequestController.upload, 
  documentRequestController.updateDocumentRequestById
);

// Other routes (GET, DELETE, etc.)
router.get('/all/document-requests', documentRequestController.getAllDocumentRequests);
router.get('/document-requests/:id', documentRequestController.getDocumentRequestById);
router.delete('/document-requests/:id', documentRequestController.deleteDocumentRequestById);
router.get('/document-requests/history/:residentId', documentRequestController.getDocumentRequestHistory);


module.exports = router;
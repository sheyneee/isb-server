const express = require('express');
const router = express.Router();
const incidentReportController = require('../../controllers/resident/incidentFilingController');


router.post('/new/incident-report',
    incidentReportController.upload,
    incidentReportController.createIncidentReport
);

router.put('/incident-reports/:id',
    incidentReportController.upload, 
    incidentReportController.updateIncidentReport
);

// Route for fetching all incident reports
router.get('/all/incident-reports', incidentReportController.getAllIncidentReports);

// Route for fetching incident report by user
router.get('/incident-reports/history/:userId', incidentReportController.getIncidentReportHistoryByUser);

// Route for fetching a specific incident report by ID
router.get('/incident-reports/:id', incidentReportController.getIncidentReportById);

// Route for deleting an incident report by ID
router.delete('/incident-reports/:id', incidentReportController.deleteIncidentReport);

module.exports = router;

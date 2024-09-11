const express = require('express');
const router = express.Router();
const householdController = require('../../controllers/resident/householdController');
const { isAuthenticated, isAdmin } = require('../../middleware/authMiddleware');

router.get('/household/id/:householdId', householdController.getHouseholdById);
router.put('/household/:householdId/update', isAuthenticated, householdController.updateHousehold);
router.put('/household/:householdId/archive', isAuthenticated, isAdmin, householdController.archiveHousehold);
router.get('/household/:householdID', householdController.getHouseholdByNumber);

module.exports = router;

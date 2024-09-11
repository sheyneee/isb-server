const Household = require('../../models/resident/householdModel');
const Resident = require('../../models/resident/residentModel');

// Update household to add members
const updateHousehold = async (req, res) => {
    try {
        const { householdId } = req.params;
        const { newMembers } = req.body; // newMembers should be an array of resident IDs

        // Find the household
        const household = await Household.findById(householdId);
        if (!household) {
            return res.status(404).json({ message: 'Household not found' });
        }

        // Add new members to the household
        household.members = household.members.concat(newMembers);
        await household.save();

        res.json({ household, message: 'Household updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

const getHouseholdById = async (req, res) => {
    try {
        const { householdId } = req.params; // Extract household ID from request parameters

        // Ensure householdId is a valid string
        if (!householdId || typeof householdId !== 'string') {
            return res.status(400).json({ message: 'Invalid householdId' });
        }

        // Find the household using household ID and populate relevant fields
        const household = await Household.findById(householdId)
            .populate({
                path: 'householdHead',
                select: 'firstName middleName lastName contactNumber'
            })
            .populate({
                path: 'members',
                select: 'residentID firstName middleName lastName sex age roleinHousehold contactNumber'
            });

        if (!household) {
            return res.status(404).json({ message: 'Household not found' });
        }

        res.json({
            householdId: household._id,
            householdID: household.householdID, 
            householdHead: household.householdHead,
            members: household.members,
            contactNumber: household.householdHead.contactNumber,
        });
    } catch (error) {
        console.error('Error in getHouseholdById:', error);
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};


// Archive household
const archiveHousehold = async (req, res) => {
    try {
        const { householdId } = req.params;

        // Find the household
        const household = await Household.findById(householdId);
        if (!household) {
            return res.status(404).json({ message: 'Household not found' });
        }

        // Archive the household (assuming we mark it as archived rather than delete it)
        household.isArchived = true;
        await household.save();

        res.json({ household, message: 'Household archived successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

const getHouseholdByNumber = async (req, res) => {
    try {
        const { householdID } = req.params;

        if (!householdID) {
            return res.status(400).json({ message: 'Invalid householdID provided' });
        }

        const household = await Household.findOne({ householdID })
            .populate('householdHead', 'firstName middleName lastName contactNumber')
            .populate('members', 'residentID firstName middleName lastName sex age roleinHousehold contactNumber');

        if (!household) {
            return res.status(404).json({ message: 'Household not found' });
        }

        const fullName = `${household.householdHead.firstName} ${household.householdHead.middleName || ''} ${household.householdHead.lastName}`;

        res.json({
            householdHeadName: fullName,
            householdHeadContactNumber: household.householdHead.contactNumber,
            household: {
                householdID: household.householdID,
                members: household.members
            }
        });
    } catch (error) {
        console.error('Error in getHouseholdByNumber:', error);
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

const getHouseholdMembers = async (req, res) => {
    try {
        const households = await Household.find().populate('members');
        const members = households.reduce((acc, household) => acc.concat(household.members), []);
        res.json({ members });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

module.exports = {
    updateHousehold,
    getHouseholdById,
    archiveHousehold,
    getHouseholdByNumber,
    getHouseholdMembers,
};

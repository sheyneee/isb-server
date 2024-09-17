const Barangay = require('../../models/barangay/barangayModel');

// Create a new barangay
const createBarangay = async (req, res) => {
    try {
        // Check if any barangay already exists
        const existingBarangay = await Barangay.findOne();
        if (existingBarangay) {
            return res.status(400).json({ message: 'A Barangay already exists. Only one Barangay can be created.' });
        }

        // Create a new barangay with no officials assigned initially
        const { barangayName, city } = req.body;
        const newBarangay = new Barangay({
            barangayName,
            city,
            // No need to assign barangayCaptain, barangaySecretary, or barangayKagawad at this stage
        });

        await newBarangay.save();
        res.json({ barangay: newBarangay, message: 'Barangay created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};


// Get all barangays
const getAllBarangays = async (req, res) => {
    try {
        const barangays = await Barangay.find();
        res.json({ barangays });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Get a barangay by ID
const getBarangayById = async (req, res) => {
    try {
        const barangay = await Barangay.findById(req.params.id);
        if (!barangay) {
            return res.status(404).json({ message: 'Barangay not found' });
        }
        res.json({ barangay });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Update a barangay by ID
const updateBarangayById = async (req, res) => {
    try {
        const barangay = await Barangay.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!barangay) {
            return res.status(404).json({ message: 'Barangay not found' });
        }
        res.json({ barangay, message: 'Barangay updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Delete a barangay by ID
const deleteBarangayById = async (req, res) => {
    try {
        const barangay = await Barangay.findByIdAndDelete(req.params.id);
        if (!barangay) {
            return res.status(404).json({ message: 'Barangay not found' });
        }
        res.json({ barangay, message: 'Barangay deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        console.log('Fetching barangay data for dashboard...');
        // Assuming there's only one barangay in the system
        const barangay = await Barangay.findOne();
        
        if (!barangay) {
            console.error('No barangay found in the database.');
            return res.status(404).json({ message: 'Barangay not found' });
        }

        // Extract the statistics
        const stats = {
            totalPopulation: barangay.population,
            totalVoters: barangay.totalvoters,
            totalIndigent: barangay.totalindigent,
            totalPWDs: barangay.totalpwd,
            totalSeniorCitizens: barangay.totalseniorcitizen,
            totalSoloParents: barangay.totalsoloparent,
            total4Ps: barangay.total4psbeneficiary,
        };

        console.log('Dashboard stats:', stats);
        res.json(stats);
    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};


module.exports = {
    createBarangay,
    getAllBarangays,
    getBarangayById,
    updateBarangayById,
    deleteBarangayById,
    getDashboardStats
};

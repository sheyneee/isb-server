const IncidentFiling = require('../../models/resident/incidentFilingModel');

const findAllUsers = (req, res) => {
    User.find()
        .then((allUsers) => {
            res.json({ users: allUsers });
        })
        .catch((err) => {
            res.json({ message: 'Something went wrong', error: err });
        });
};

module.exports = {
    findAllUsers,
    
};

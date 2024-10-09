const cron = require('node-cron');
const IncidentReport = require('../models/resident/incidentFilingModel');

// Function to delete archived reports older than 90 days and log days until deletion
const deleteArchivedRecords = async () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    try {
        const archivedReports = await IncidentReport.find({ status: 'Archived' });

        archivedReports.forEach(report => {
            console.log(`Incident Report ${report.ReferenceNo} will be deleted in ${report.daysUntilDeletion} days.`);
        });

        const result = await IncidentReport.deleteMany({
            status: 'Archived',
            archived_at: { $lte: ninetyDaysAgo }
        });

        console.log(`Deleted ${result.deletedCount} archived incident reports.`);
    } catch (error) {
        console.error('Error deleting archived incident reports:', error);
    }
};

// Schedule a cron job to run once a day at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled task to delete archived incident reports');
    await deleteArchivedRecords();
});

module.exports = deleteArchivedRecords;

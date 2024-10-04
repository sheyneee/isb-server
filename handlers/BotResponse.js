const axios = require('axios');
const DocumentRequest = require('../models/resident/documentrequestModel');
const Announcement = require('../models/admin/announcementModel');
const IncidentReport = require('../models/resident/incidentFilingModel')
let currentMessageId = 1;

const predefinedAnswers = {
  hello: 'Hi! How can I assist you today?',
  bye: 'Goodbye! Have a great day!',
};

// Generates predefined responses for general questions
const generatePredefinedResponse = (question, user) => {
  const answer = predefinedAnswers[question.toLowerCase()] || "I'm not sure how to respond to that. Could you please rephrase?";
  return {
    _id: currentMessageId++,
    text: `Hi ${user.username}, ${answer}`,
    createdAt: new Date(),
    user: {
      _id: 'bot',
      name: 'AmBot',
    },
  };
};

// Generates a welcome response
const generateChatWithBotResponse = (user) => {
  return {
    _id: currentMessageId++,
    text: `Hi ${user.username}, I'm AmBot, your personal assistant! How can I assist you today?`,
    createdAt: new Date(),
    user: {
      _id: 'bot',
      name: 'AmBot',
    },
  };
};

// Handles the bot's response logic
const handleBotResponse = async (messageText, user, botMode) => {
  const lowerCaseMessage = messageText.toLowerCase().trim(); // Always convert to lowercase

  // Check for announcements
  if (lowerCaseMessage.includes('announcements')) {
    try {
      // Fetch announcements from the Announcement model
      const announcements = await Announcement.find().sort({ created_at: -1 });

      if (announcements.length > 0) {
        let announcementText = 'Here are the latest announcements:\n';
        announcements.forEach((announcement, index) => {
          announcementText += `${index + 1}. ${announcement.title} - ${new Date(announcement.created_at).toLocaleDateString()}\n`;
        });

        return {
          _id: currentMessageId++,
          text: announcementText,
          createdAt: new Date(),
          user: {
            _id: 'bot',
            name: 'AmBot',
          },
        };
      } else {
        return {
          _id: currentMessageId++,
          text: 'There are no announcements available right now.',
          createdAt: new Date(),
          user: {
            _id: 'bot',
            name: 'AmBot',
          },
        };
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      return {
        _id: currentMessageId++,
        text: "Sorry, I couldn't fetch the announcements. Please try again later.",
        createdAt: new Date(),
        user: {
          _id: 'bot',
          name: 'AmBot',
        },
      };
    }
  }

  // Fetch document request history
  if (lowerCaseMessage.includes("document request history")) {
    try {
      const documentRequests = await DocumentRequest.find({
        requestedBy: user.userId,
      });

      if (documentRequests.length > 0) {
        let documentHistoryText = "Here is your document request history:\n";
        documentRequests.forEach((doc, index) => {
          documentHistoryText += `${index + 1}. ${doc.documentType} - ${doc.status} - ${new Date(doc.created_at).toLocaleDateString()}\n`;
        });

        return {
          _id: currentMessageId++,
          text: documentHistoryText,
          createdAt: new Date(),
          user: {
            _id: "bot",
            name: "AmBot",
          },
        };
      } else {
        return {
          _id: currentMessageId++,
          text: "You have no document request history.",
          createdAt: new Date(),
          user: {
            _id: "bot",
            name: "AmBot",
          },
        };
      }
    } catch (error) {
      console.error('Error fetching document request history:', error);
      return {
        _id: currentMessageId++,
        text: "Sorry, I couldn't fetch your document request history. Please try again later.",
        createdAt: new Date(),
        user: {
          _id: "bot",
          name: "AmBot",
        },
      };
    }
  }

    // Fetch incident report history
    if (lowerCaseMessage.includes('incident report')) {
      try {
        const incidentReports = await IncidentReport.find({
          complainantID: user.userId,
        }).sort({ created_at: -1 });
  
        if (incidentReports.length > 0) {
          let incidentReportText = "Here is your incident report history:\n";
          incidentReports.forEach((report, index) => {
            incidentReportText += `${index + 1}. ${report.ReferenceNo} - ${report.typeofcomplaint} - ${report.status} - ${new Date(report.created_at).toLocaleDateString()}\n`;
          });
  
          return {
            _id: currentMessageId++,
            text: incidentReportText,
            createdAt: new Date(),
            user: {
              _id: "bot",
              name: "AmBot",
            },
          };
        } else {
          return {
            _id: currentMessageId++,
            text: "You have no incident report history.",
            createdAt: new Date(),
            user: {
              _id: "bot",
              name: "AmBot",
            },
          };
        }
      } catch (error) {
        console.error('Error fetching incident report history:', error);
        return {
          _id: currentMessageId++,
          text: "Sorry, I couldn't fetch your incident report history. Please try again later.",
          createdAt: new Date(),
          user: {
            _id: "bot",
            name: "AmBot",
          },
        };
      }
    }
    
  // Handoff request to barangay official
  if (lowerCaseMessage.includes('chat with official')) {
    return {
      _id: currentMessageId++,
      text: `I'm handing off this conversation to a barangay official for further assistance.`,
      createdAt: new Date(),
      user: {
        _id: 'bot',
        name: 'AmBot',
      },
    };
  }


  return generatePredefinedResponse(lowerCaseMessage, user);
};

module.exports = { handleBotResponse };

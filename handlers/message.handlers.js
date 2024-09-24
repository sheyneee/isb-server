const { handleBotResponse } = require('./BotResponse');

let currentMessageId = 1;
let botMode = { active: true }; // Bot always active
let handoffRequests = {};  // Tracks handoff requests for 1-to-1 chat with admin
let pendingRequests = {};  // Stores pending chat requests

const generateMessage = (user, messageText) => {
  return {
    _id: `${Date.now()}-${currentMessageId++}`,
    text: typeof messageText === 'string' ? messageText : messageText.text || "",
    createdAt: new Date(),
    user: {
      _id: user.userId,
      name: user.username || "Unknown",
      avatar: user.profilepic || "https://default-avatar-url.png", // Use user's profilepic, with fallback if none exists
    },
  };
};

// Creates a message and handles the bot and handoff logic
const createMessage = (socket, users, io, admins) => {
  socket.on("message", async (messageText) => {
    console.log("Received message:", messageText);

    const user = users[socket.id];
    if (user) {
      const message = generateMessage(user, messageText);
      const text = typeof messageText === 'string' ? messageText : messageText.text;

      // If there is a handoff request, forward the message to the assigned admin
      if (handoffRequests[socket.id]) {
        const adminSocketId = handoffRequests[socket.id];
        io.to(adminSocketId).emit('message', message);
        console.log(`Message forwarded to admin with socket ID: ${adminSocketId}`);
      } else {
        // Bot responds to the user
        const botMessage = await handleBotResponse(text, user, botMode);
        if (botMessage) {
          socket.emit("message", botMessage);  // Send bot response only to the user
          console.log("Bot responded:", botMessage);
        }

        // If the user requests a chat with a barangay official, send request to admins
        if (text.toLowerCase().includes("chat with official")) {
          pendingRequests[socket.id] = user;  // Store pending request
          
          // Notify all admins about the new chat request
          for (let adminSocketId in admins) {
            io.to(adminSocketId).emit('chatRequest', {
              residentId: user.userId,
              residentName: user.username,
              residentSocketId: socket.id
            });
          }

          socket.emit("message", {
            _id: currentMessageId++,
            text: "Your request to chat with a barangay official has been sent.",
            createdAt: new Date(),
            user: {
              _id: "bot",
              name: "AmBot",
            },
          });
        }
      }
    } else {
      console.log("User not found for socket:", socket.id);
    }
  });

  // When an admin accepts a chat request
  socket.on('acceptRequest', (residentSocketId) => {
    const admin = users[socket.id];
    const resident = users[residentSocketId];

    if (admin && resident && admins[socket.id]) {
      handoffRequests[residentSocketId] = socket.id;  // Assign admin to the resident
      delete pendingRequests[residentSocketId];  // Remove the pending request
      
      // Notify the user that their request has been accepted
      io.to(residentSocketId).emit('message', {
        _id: currentMessageId++,
        text: `You are now connected with ${admin.username}.`,
        createdAt: new Date(),
        user: {
          _id: "bot",
          name: "AmBot",
        },
      });

      // Notify the admin that they are connected with the user
      io.to(socket.id).emit('message', {
        _id: currentMessageId++,
        text: `You are now connected with ${resident.username}.`,
        createdAt: new Date(),
        user: {
          _id: "bot",
          name: "AmBot",
        },
      });
    }
  });

  // When an admin declines a chat request
  socket.on('declineRequest', (residentSocketId) => {
    const admin = users[socket.id];
    const resident = users[residentSocketId];

    if (admin && resident && admins[socket.id]) {
      io.to(residentSocketId).emit('message', {
        _id: currentMessageId++,
        text: `Your request to chat with a barangay official has been declined.`,
        createdAt: new Date(),
        user: {
          _id: "bot",
          name: "AmBot",
        },
      });
    }
  });
};

module.exports = { createMessage };

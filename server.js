const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser'); 
const http = require('http');
const socketIo = require('socket.io');
const messageHandler = require('./handlers/message.handlers');
const archivedCleanup = require('./handlers/archivedCleanup');

require('./config/mongo_config');
require('dotenv').config();
archivedCleanup();

const app = express();
const server = http.createServer(app);

// CORS setup for Express (still needed for React.js web)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware setup
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes setup
const adminRoutes = require('./routes/admin/adminRoutes');
const barangayRoutes = require('./routes/barangay/barangayRoutes');
const residentRoutes = require('./routes/resident/residentRoutes');
const householdRoutes = require('./routes/resident/householdRoutes');
const announcementRoutes = require('./routes/admin/announcementRoutes');
const documentrequestRoutes = require('./routes/resident/documentrequestRoutes');
const incidentfilingRoutes = require('./routes/resident/incidentfilingRoutes')

app.use('/api', adminRoutes);
app.use('/api', barangayRoutes);
app.use('/api', residentRoutes);
app.use('/api', householdRoutes);
app.use('/api', announcementRoutes);
app.use('/api', documentrequestRoutes);
app.use('/api', incidentfilingRoutes);

// Socket.IO CORS setup for Web and React Native clients
const io = socketIo(server, {
    cors: {
      origin: ['http://localhost:3000'], // React.js web frontend
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
  });
  
  // Socket.IO logic remains the same for both React.js and React Native clients
  let users = {};
  let admins = {};
  
  io.on('connection', (socket) => {
    console.log(`A user connected with socket id: ${socket.id}`);
  
    socket.on('join', (userData) => {
      // Store the user's data, including userId
      users[socket.id] = {
        userId: userData.userId,  // Store user._id sent from the frontend
        username: `${userData.firstName} ${userData.lastName}`,
        role: userData.role,
      };
      console.log(`User joined: ${users[socket.id].username} with ID: ${users[socket.id].userId}`);
    });
  
    // Handle messages and other events
    messageHandler.createMessage(socket, users, io, admins);
  
    socket.on('disconnect', () => {
      console.log(`${users[socket.id]?.username || "User"} disconnected`);
      delete users[socket.id];
      delete admins[socket.id];
    });
  });
  
  
  // Start the server
  const PORT = 8000;
  server.listen(PORT, () => {
    console.log(`>> Server is running on port ${PORT} <<`);
  });
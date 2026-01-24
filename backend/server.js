const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/authRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const participantRoutes = require('./routes/participantRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
  }
});

// Middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/participants', participantRoutes);

// Error handler middleware
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join exercise room
  socket.on('joinExercise', (exerciseId) => {
    socket.join(`exercise-${exerciseId}`);
    console.log(`Socket ${socket.id} joined exercise-${exerciseId}`);
  });

  // Join participant room
  socket.on('joinAsParticipant', (participantId) => {
    socket.join(`participant-${participantId}`);
    console.log(`Socket ${socket.id} joined as participant-${participantId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
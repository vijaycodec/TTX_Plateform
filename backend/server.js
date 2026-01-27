const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
// import cors from 'cors'

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
    origin: true, // Allow all origins (or specify array of allowed origins)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
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

// Enable CORS - Allow all origins for local network access
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/participants', participantRoutes);

// Error handler middleware
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  // Join exercise room
  socket.on('joinExercise', (exerciseId) => {
    socket.join(`exercise-${exerciseId}`);
    console.log(`📥 Socket ${socket.id} joined exercise-${exerciseId}`);

    // Log all rooms this socket is in
    const rooms = Array.from(socket.rooms);
    console.log(`  ➡️ Socket ${socket.id} is now in rooms:`, rooms);
  });

  // Join participant room
  socket.on('joinAsParticipant', (participantId) => {
    socket.join(`participant-${participantId}`);
    console.log(`📥 Socket ${socket.id} joined participant-${participantId}`);

    // Log all rooms this socket is in
    const rooms = Array.from(socket.rooms);
    console.log(`  ➡️ Socket ${socket.id} is now in rooms:`, rooms);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(5000, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment configuration variables
dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const locationRoutes = require('./routes/locationRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const initSocketHandler = require('./socket/socketHandler');

// Initialize Express App and HTTP Server
const app = express();
const server = http.createServer(app);

// Connect to MongoDB Database
connectDB();

// Setup Cross-Origin Resource Sharing (CORS)
const CLIENT_URL = process.env.CLIENT_URL || '*';
app.use(cors({
  origin: true,
  credentials: true
}));

// Express Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Socket.io Event Handlers
initSocketHandler(io);

// Root route to prevent Render 404 ping logs
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'GeoConnect API Backend Server is Running Successfully!',
    health: '/api/health'
  });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Location-Based Professional & Research Networking API',
    timestamp: new Date()
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start Server listening on PORT (Render sets process.env.PORT automatically)
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Location Networking Server running on PORT: ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

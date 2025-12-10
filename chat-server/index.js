require("dotenv").config(); // Load environment variables

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

// routes
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const chatRoutes = require("./routes/chat");
const aiService = require("./services/ai.service");

const app = express();

// Basic middleware setup
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 3000;

// Connect to MongoDB and initialize AI service
mongoose.connect(MONGO_URL)
  .then(async () => {
    console.log("MongoDB connected");
    await aiService.initializeGemini();
  })
  .catch(err => console.error(err));

// Create HTTP + Socket.io server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingTimeout: 60000,           // Disconnect inactive clients
  connectionStateRecovery: {}   // Helps restore missed events
});

// Register API routes
app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/chat", chatRoutes);
app.use("/ai", require("./routes/ai"));

const { initializeSocket } = require("./socket");

// Attach socket event handlers
initializeSocket(io);

// Start server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

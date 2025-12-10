require("dotenv").config(); // Load environment variables

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { initializeSocket } = require("./socket");
const aiService = require("./services/ai.service");

// Routes
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const chatRoutes = require("./routes/chat");
const aiRoutes = require("./routes/ai");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB().then(async () => {
  await aiService.initializeGemini();
});

// Middleware
app.use(cors({
  origin: "*", // TODO: Configure this for production
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Register API Routes
app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/chat", chatRoutes);
app.use("/ai", aiRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Create HTTP + Socket.io Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingTimeout: 60000,
  connectionStateRecovery: {}
});

// Attach socket event handlers
initializeSocket(io);

// Start Server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

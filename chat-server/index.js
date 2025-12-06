require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const Message = require("./models/message");
const User = require("./models/user");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const chatRoutes = require("./routes/chat");
const aiService = require("./services/ai.service");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 3000;

// Initialize Gemini & Bot
mongoose.connect(MONGO_URL)
  .then(async () => {
    console.log("MongoDB connected");
    await aiService.initializeGemini();
  })
  .catch(err => console.error(err));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingTimeout: 60000,
  connectionStateRecovery: {}
});

app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/chat", chatRoutes);

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  socket.on("setup", (userData) => {
    if (!userData || !userData._id) {
      console.warn("Socket setup failed: missing userData or _id");
      return;
    }
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", async (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit("message received", newMessageRecieved);
    });

    // Handle AI Bot Response - REMOVED (Moved to REST API)
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

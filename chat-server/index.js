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

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini
let genAI;
let model;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
} else {
  console.warn("GEMINI_API_KEY is missing. AI Bot will not function.");
}

// AI Bot User ID
let aiBotId = null;

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log("MongoDB connected");
    initializeAIBot();
  })
  .catch(err => console.error(err));

async function initializeAIBot() {
  try {
    let bot = await User.findOne({ username: "AI Bot" });
    if (!bot) {
      // Create AI Bot if not exists. Password can be anything complex.
      const hashedPassword = "ai_bot_secure_password_placeholder";
      bot = await User.create({
        username: "AI Bot",
        password: hashedPassword
      });
      console.log("AI Bot user created.");
    }
    aiBotId = bot._id.toString();
    console.log("AI Bot ID:", aiBotId);
  } catch (error) {
    console.error("Error initializing AI Bot:", error);
  }
}

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

    // Handle AI Bot Response
    if (aiBotId && model) {
      const isBotInChat = chat.users.some(u => u._id.toString() === aiBotId);
      const isSenderBot = newMessageRecieved.sender._id === aiBotId;

      if (isBotInChat && !isSenderBot) {
        // Trigger AI response
        try {
          const prompt = newMessageRecieved.content;

          // Identify sender name for context
          const senderName = newMessageRecieved.sender.username || "User";
          // Basic prompt engineering
          const fullPrompt = `You are a helpful assistant in a chat app. The user ${senderName} says: "${prompt}". Reply concisely.`;

          const result = await model.generateContent(fullPrompt);
          const responseText = result.response.text();

          // Create Message in DB
          const botMessage = await Message.create({
            sender: aiBotId,
            content: responseText,
            chat: chat._id
          });

          // Populate sender for frontend
          const fullBotMessage = await Message.findById(botMessage._id)
            .populate("sender", "username")
            .populate("chat");

          // Emit to chat users
          chat.users.forEach((user) => {
            socket.in(user._id).emit("message received", fullBotMessage);
          });

        } catch (error) {
          console.error("Error generating AI response:", error);
        }
      }
    }
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

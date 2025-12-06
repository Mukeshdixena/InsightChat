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
app.use("/ai", require("./routes/ai"));

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

  // AI Rewrite Handler
  socket.on("request rewrite", async (text) => {
    try {
      const suggestions = await aiService.generateRewriteSuggestions(text);
      if (suggestions) {
        socket.emit("rewrite suggestions", { original: text, suggestions });
      }
    } catch (error) {
      console.error("Error generating rewrite suggestions:", error);
    }
  });

  socket.on("new message", async (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit("message received", newMessageRecieved);
    });

    // Handle AI Bot Response - REMOVED (Moved to REST API)
  });

  // Message Delivered Event
  socket.on("message delivered", async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      // Add user to deliveredTo array if not already there
      if (!message.deliveredTo.includes(userId)) {
        message.deliveredTo.push(userId);

        // Update status to delivered if not already read
        if (message.status === 'sent') {
          message.status = 'delivered';
        }

        await message.save();

        // Notify sender about delivery
        socket.in(message.sender.toString()).emit("message status updated", {
          messageId: message._id,
          status: message.status,
          deliveredTo: message.deliveredTo
        });
      }
    } catch (error) {
      console.error("Error updating message delivery status:", error);
    }
  });

  // Message Read Event (single message)
  socket.on("message read", async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      // Add user to readBy array if not already there
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
        message.status = 'read';
        await message.save();

        // Notify sender about read status
        socket.in(message.sender.toString()).emit("message status updated", {
          messageId: message._id,
          status: message.status,
          readBy: message.readBy
        });
      }
    } catch (error) {
      console.error("Error updating message read status:", error);
    }
  });

  // Batch Mark Messages as Read
  socket.on("messages read", async ({ messageIds, userId }) => {
    try {
      const messages = await Message.find({ _id: { $in: messageIds } });

      for (const message of messages) {
        if (!message.readBy.includes(userId)) {
          message.readBy.push(userId);
          message.status = 'read';
          await message.save();

          // Notify sender
          socket.in(message.sender.toString()).emit("message status updated", {
            messageId: message._id,
            status: message.status,
            readBy: message.readBy
          });
        }
      }
    } catch (error) {
      console.error("Error batch updating read status:", error);
    }
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

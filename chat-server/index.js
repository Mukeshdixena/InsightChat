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

  socket.on("request rewrite", async (data) => {
    try {
      const { text, customPrompt } = typeof data === 'object' ? data : { text: data };
      const suggestions = await aiService.generateRewriteSuggestions(text, customPrompt);
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

  });

  socket.on("message delivered", async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;


      if (!message.deliveredTo.includes(userId)) {
        message.deliveredTo.push(userId);

        if (message.status === 'sent') {
          message.status = 'delivered';
        }

        await message.save();

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

  socket.on("message read", async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
        message.status = 'read';
        await message.save();

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

  socket.on("messages read", async ({ messageIds, userId }) => {
    try {
      const messages = await Message.find({ _id: { $in: messageIds } });

      for (const message of messages) {
        if (!message.readBy.includes(userId)) {
          message.readBy.push(userId);
          message.status = 'read';
          await message.save();

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

  socket.on("reaction added", async ({ messageId, emoji, userId, chatId }) => {
    socket.in(chatId).emit("reaction updated", { messageId, emoji, userId });
  });

  socket.on("message edited", async ({ messageId, content, chatId }) => {
    socket.in(chatId).emit("message updated", { messageId, content, isEdited: true });
  });

  socket.on("message deleted", async ({ messageId, chatId }) => {
    socket.in(chatId).emit("message removed", { messageId });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const express = require("express");
const router = express.Router();
const Message = require("../models/message");
const User = require("../models/user");
const Chat = require("../models/chat");

// Get messages for a specific chat
router.get("/:chatId", async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "username")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message (API fallback if socket fails, or just for verification)
router.post("/", async (req, res) => {
  const { content, chatId, userId } = req.body;

  if (!content || !chatId || !userId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: userId,
    content: content,
    chat: chatId,
    status: 'sent',
    deliveredTo: [],
    readBy: []
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "username");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "username",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    // --- AI BOT LOGIC START ---
    const aiService = require("../services/ai.service");
    const aiBotId = aiService.getAiBotId();
    let aiResponseGenerated = false;

    if (aiBotId) {
      // Check participation
      const isAiChat = message.chat.users.some(u => u._id.toString() === aiBotId);
      const isSenderBot = userId === aiBotId;

      if (isAiChat && !isSenderBot) {
        // Generate AI Response synchronously
        try {
          const prompt = content;
          const senderName = message.sender.username || "User";

          const responseText = await aiService.generateResponse(prompt, senderName);

          if (responseText) {
            const botMessage = await Message.create({
              sender: aiBotId,
              content: responseText,
              chat: chatId,
              status: 'sent',
              deliveredTo: [],
              readBy: []
            });

            await Chat.findByIdAndUpdate(chatId, { latestMessage: botMessage });
            aiResponseGenerated = true;
          }
        } catch (aiError) {
          console.error("AI Generation failed:", aiError);
          // We continue without AI response, just treating it as a normal message
        }
      }
    }
    // --- AI BOT LOGIC END ---

    if (aiResponseGenerated) {
      // Return full history so frontend shows both messages instantly
      const fullMessages = await Message.find({ chat: chatId })
        .populate("sender", "username")
        .populate("chat");
      res.json(fullMessages);
    } else {
      res.json(message);
    }

  } catch (error) {
    res.status(400).json(error.message);
  }
});

// Clear all messages in a chat
router.delete("/:chatId", async (req, res) => {
  try {
    await Message.deleteMany({ chat: req.params.chatId });
    res.json({ message: "Chat cleared successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

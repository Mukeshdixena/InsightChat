const express = require("express");
const router = express.Router();
const Message = require("../models/message");
const User = require("../models/user");
const Chat = require("../models/chat");

router.get("/:chatId", async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "username")
      .populate("chat")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "username" }
      });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

    const aiService = require("../services/ai.service");
    const aiBotId = aiService.getAiBotId();
    let aiResponseGenerated = false;

    if (aiBotId) {
      const isAiChat = message.chat.users.some(u => u._id.toString() === aiBotId);
      const isSenderBot = userId === aiBotId;

      if (isAiChat && !isSenderBot) {
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
        }
      }
    }

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

router.post("/:messageId/reaction", async (req, res) => {
  try {
    const { emoji, userId } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) return res.status(404).json({ error: "Message not found" });

    let reaction = message.reactions.find(r => r.emoji === emoji);

    if (reaction) {
      const userIndex = reaction.users.indexOf(userId);
      if (userIndex > -1) {
        reaction.users.splice(userIndex, 1);
        if (reaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        reaction.users.push(userId);
      }
    } else {
      message.reactions.push({ emoji, users: [userId] });
    }

    await message.save();
    res.json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:messageId", async (req, res) => {
  try {
    const { content, userId } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) return res.status(404).json({ error: "Message not found" });

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();
    res.json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:messageId", async (req, res) => {
  try {
    const { userId } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) return res.status(404).json({ error: "Message not found" });

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = ""; // Clear content for privacy

    await message.save();
    res.json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/chat/:chatId", async (req, res) => {
  try {
    await Message.deleteMany({ chat: req.params.chatId });
    res.json({ message: "Chat cleared successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

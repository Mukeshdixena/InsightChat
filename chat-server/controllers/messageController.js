// controllers/messageController.js

const Message = require("../models/message");
const User = require("../models/user");
const Chat = require("../models/chat");
const aiService = require("../services/ai.service");

// Fetch all messages for a chat
exports.fetchMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "username")
      .populate("chat")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "username" }
      });

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Send new message (with optional AI auto-reply)
exports.sendMessage = async (req, res) => {
  try {
    const { content, chatId, userId } = req.body;

    if (!content || !chatId || !userId) {
      return res.sendStatus(400);
    }

    // Create user message
    let message = await Message.create({
      sender: userId,
      content,
      chat: chatId,
      status: "sent",
      deliveredTo: [],
      readBy: []
    });

    message = await message.populate("sender", "username");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "username"
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    // AI bot response logic
    const aiBotId = aiService.getAiBotId();
    let aiResponseGenerated = false;

    if (aiBotId) {
      const isAiChat = message.chat.users.some(u => u._id.toString() === aiBotId);
      const isSenderBot = userId === aiBotId;

      if (isAiChat && !isSenderBot) {
        try {
          const senderName = message.sender.username || "User";
          const responseText = await aiService.generateResponse(content, senderName);

          if (responseText) {
            const botMessage = await Message.create({
              sender: aiBotId,
              content: responseText,
              chat: chatId,
              status: "sent",
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

    // If AI replied, return full chat messages instead of single message
    if (aiResponseGenerated) {
      const fullMessages = await Message.find({ chat: chatId })
        .populate("sender", "username")
        .populate("chat");

      return res.json(fullMessages);
    }

    return res.json(message);

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Add/remove reaction
exports.toggleReaction = async (req, res) => {
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
    return res.json(message);

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Edit message
exports.editMessage = async (req, res) => {
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

    return res.json(message);

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Soft delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { userId } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = "";
    await message.save();

    return res.json(message);

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Clear all messages in a chat
exports.clearChat = async (req, res) => {
  try {
    await Message.deleteMany({ chat: req.params.chatId });
    return res.json({ message: "Chat cleared successfully" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

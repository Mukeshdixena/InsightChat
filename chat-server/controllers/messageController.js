// controllers/messageController.js
const Message = require("../models/message");
const User = require("../models/user");
const Chat = require("../models/chat");
const aiService = require("../services/ai.service");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Fetch all messages for a chat
// @route   GET /messages/:chatId
// @access  Private
exports.fetchMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "username email pic")
    .populate("chat")
    .populate({
      path: "replyTo",
      populate: { path: "sender", select: "username" }
    });

  res.json(messages);
});

// @desc    Send new message (with optional AI auto-reply)
// @route   POST /messages
// @access  Private
exports.sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, userId } = req.body;

  if (!content || !chatId || !userId) {
    res.status(400);
    throw new Error("Invalid request data");
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

  message = await message.populate("sender", "username pic");
  message = await message.populate("chat");
  message = await User.populate(message, {
    path: "chat.users",
    select: "username pic email"
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
            status: "sent"
          });

          await Chat.findByIdAndUpdate(chatId, { latestMessage: botMessage });
          aiResponseGenerated = true;
        }
      } catch (aiError) {
        console.error("AI Generation failed:", aiError);
        // We don't fail the request if AI fails, just log it
      }
    }
  }

  // If AI replied, return updated chat messages
  if (aiResponseGenerated) {
    const fullMessages = await Message.find({ chat: chatId })
      .populate("sender", "username pic")
      .populate("chat");
    return res.json(fullMessages);
  }

  res.json(message);
});

// @desc    Add/remove reaction
// @route   PUT /messages/:messageId/react
// @access  Private
exports.toggleReaction = asyncHandler(async (req, res) => {
  const { emoji, userId } = req.body;
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);

  if (reactionIndex > -1) {
    // Reaction exists, toggle user
    const reaction = message.reactions[reactionIndex];
    const userIndex = reaction.users.indexOf(userId);

    if (userIndex > -1) {
      // Remove user
      reaction.users.splice(userIndex, 1);
      // If no users left for this emoji, remove the reaction object
      if (reaction.users.length === 0) {
        message.reactions.splice(reactionIndex, 1);
      }
    } else {
      // Add user
      reaction.users.push(userId);
    }
  } else {
    // New reaction
    message.reactions.push({ emoji, users: [userId] });
  }

  await message.save();
  res.json(message);
});

// @desc    Edit message
// @route   PUT /messages/:messageId
// @access  Private
exports.editMessage = asyncHandler(async (req, res) => {
  const { content, userId } = req.body;
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  if (message.sender.toString() !== userId) {
    res.status(403);
    throw new Error("Not authorized to edit this message");
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  res.json(message);
});

// @desc    Soft delete message
// @route   DELETE /messages/:messageId
// @access  Private
exports.deleteMessage = asyncHandler(async (req, res) => {
  const { userId } = req.body; // TODO: Should typically come from req.user set by auth middleware
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  if (message.sender.toString() !== userId) {
    res.status(403);
    throw new Error("Not authorized to delete this message");
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = "This message was deleted"; // Standardize content for deleted messages
  await message.save();

  res.json(message);
});

// @desc    Clear all messages in a chat
// @route   DELETE /messages/chat/:chatId
// @access  Private
exports.clearChat = asyncHandler(async (req, res) => {
  await Message.deleteMany({ chat: req.params.chatId });
  res.json({ message: "Chat cleared successfully" });
});

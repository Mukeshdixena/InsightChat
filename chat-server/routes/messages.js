// routes/messageRoutes.js

const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");

// Fetch messages of a chat
router.get("/:chatId", messageController.fetchMessages);

// Send message (with optional AI auto-reply)
router.post("/", messageController.sendMessage);

// Add/remove reaction
router.post("/:messageId/reaction", messageController.toggleReaction);

// Edit message
router.put("/:messageId", messageController.editMessage);

// Soft delete message
router.delete("/:messageId", messageController.deleteMessage);

// Clear chat messages entirely
router.delete("/chat/:chatId", messageController.clearChat);

module.exports = router;

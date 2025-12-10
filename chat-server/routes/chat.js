// routes/chatRoutes.js

const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chatController");

// Create or fetch 1-to-1 chat
router.post("/", chatController.accessChat);

// Fetch all chats for a user
router.get("/:userId", chatController.fetchChats);

// Create a group chat
router.post("/group", chatController.createGroupChat);

// Rename group
router.put("/rename", chatController.renameGroup);

// Add user to group
router.put("/groupadd", chatController.addToGroup);

// Remove user from group
router.put("/groupremove", chatController.removeFromGroup);

module.exports = router;

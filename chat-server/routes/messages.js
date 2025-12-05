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

    res.json(message);
  } catch (error) {
    res.status(400).json(error.message);
  }
});

module.exports = router;

// controllers/chatController.js

const Chat = require("../models/chat");
const User = require("../models/user");
const Message = require("../models/message");

// Create or fetch one-to-one chat
exports.accessChat = async (req, res) => {
  try {
    const { userId, otherUserId } = req.body;

    if (!userId || !otherUserId) {
      return res.status(400).send("UserId and OtherUserId are required");
    }

    let isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: userId } } },
        { users: { $elemMatch: { $eq: otherUserId } } }
      ]
    })
      .populate("users", "-password")
      .populate("latestMessage");

    isChat = await User.populate(isChat, {
      path: "latestMessage.sender",
      select: "username"
    });

    if (isChat.length > 0) {
      return res.send(isChat[0]);
    }

    // Create new chat
    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [userId, otherUserId]
    };

    const createdChat = await Chat.create(chatData);

    const fullChat = await Chat.findOne({ _id: createdChat._id })
      .populate("users", "-password");

    return res.status(200).json(fullChat);

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Fetch all chats for a user
exports.fetchChats = async (req, res) => {
  try {
    const userId = req.params.userId;

    let results = await Chat.find({
      users: { $elemMatch: { $eq: userId } }
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    results = await User.populate(results, {
      path: "latestMessage.sender",
      select: "username"
    });

    // Add unread message count to each chat
    const chatsWithUnread = await Promise.all(
      results.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chat: chat._id,
          sender: { $ne: userId },
          readBy: { $ne: userId }
        });

        return { ...chat._doc, unreadCount };
      })
    );

    return res.status(200).send(chatsWithUnread);

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Create a group chat
exports.createGroupChat = async (req, res) => {
  try {
    const { users, name, adminId } = req.body;

    if (!users || !name || !adminId) {
      return res.status(400).send({ message: "All fields are required" });
    }

    const parsedUsers = JSON.parse(users);

    if (parsedUsers.length < 1) {
      return res.status(400).send("At least one user is required to form a group chat");
    }

    parsedUsers.push(adminId);

    const groupChat = await Chat.create({
      chatName: name,
      users: parsedUsers,
      isGroupChat: true,
      groupAdmin: adminId
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    return res.status(200).json(fullGroupChat);

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Rename group
exports.renameGroup = async (req, res) => {
  try {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!updatedChat) {
      return res.status(404).send("Chat Not Found");
    }

    return res.json(updatedChat);

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Add user to group
exports.addToGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!updatedChat) {
      return res.status(404).send("Chat Not Found");
    }

    return res.json(updatedChat);

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Remove user from group
exports.removeFromGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!updatedChat) {
      return res.status(404).send("Chat Not Found");
    }

    return res.json(updatedChat);

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

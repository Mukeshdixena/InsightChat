// controllers/chatController.js
const Chat = require("../models/chat");
const User = require("../models/user");
const Message = require("../models/message");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Create or fetch one-to-one chat
// @route   POST /chat
// @access  Private
exports.accessChat = asyncHandler(async (req, res) => {
  const { userId, otherUserId } = req.body;

  if (!userId || !otherUserId) {
    res.status(400);
    throw new Error("UserId and OtherUserId are required");
  }

  // Check if chat exists
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
    select: "username pic email"
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    // Create new chat
    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [userId, otherUserId]
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findOne({ _id: createdChat._id })
      .populate("users", "-password");

    res.status(200).json(fullChat);
  }
});

// @desc    Fetch all chats for a user
// @route   GET /chat/:userId
// @access  Private
exports.fetchChats = asyncHandler(async (req, res) => {
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
    select: "username pic email"
  });

  // Add unread message count
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

  res.status(200).send(chatsWithUnread);
});

// @desc    Create a group chat
// @route   POST /chat/group
// @access  Private
exports.createGroupChat = asyncHandler(async (req, res) => {
  const { users, name, adminId } = req.body;

  if (!users || !name || !adminId) {
    res.status(400);
    throw new Error("All fields are required");
  }

  let parsedUsers = users;
  if (typeof users === "string") {
    try {
      parsedUsers = JSON.parse(users);
    } catch (e) {
      res.status(400);
      throw new Error("Invalid users format");
    }
  }

  if (parsedUsers.length < 1) {
    res.status(400);
    throw new Error("At least one user is required to form a group chat");
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

  res.status(200).json(fullGroupChat);
});

// @desc    Rename group
// @route   PUT /chat/rename
// @access  Private
exports.renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { chatName },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat Not Found");
  }

  res.json(updatedChat);
});

// @desc    Add user to group
// @route   PUT /chat/groupadd
// @access  Private
exports.addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $addToSet: { users: userId } }, // Use $addToSet to avoid duplicates
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat Not Found");
  }

  res.json(updatedChat);
});

// @desc    Remove user from group
// @route   PUT /chat/groupremove
// @access  Private
exports.removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { users: userId } },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat Not Found");
  }

  res.json(updatedChat);
});

// Chat routes for creating chats, fetching user chats, and managing group chats

const express = require("express");
const router = express.Router();
const Chat = require("../models/chat");
const User = require("../models/user");
const Message = require("../models/message");

// Create or fetch one-to-one chat
router.post("/", async (req, res) => {
    const { userId, otherUserId } = req.body;

    if (!userId || !otherUserId) {
        return res.status(400).send("UserId and OtherUserId param sent");
    }

    // Check if chat already exists
    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: userId } } },
            { users: { $elemMatch: { $eq: otherUserId } } },
        ],
    })
        .populate("users", "-password")
        .populate("latestMessage");

    isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "username",
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        // Create new chat
        var chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [userId, otherUserId],
        };

        try {
            const createdChat = await Chat.create(chatData);
            const FullChat = await Chat.findOne({ _id: createdChat._id })
                .populate("users", "-password");

            res.status(200).json(FullChat);
        } catch (error) {
            res.status(400).json(error.message);
        }
    }
});

// Fetch all chats for a user
router.get("/:userId", async (req, res) => {
    try {
        Chat.find({ users: { $elemMatch: { $eq: req.params.userId } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: "latestMessage.sender",
                    select: "username",
                });

                // Add unread message count
                const chatsWithUnread = await Promise.all(results.map(async (chat) => {
                    const unreadCount = await Message.countDocuments({
                        chat: chat._id,
                        sender: { $ne: req.params.userId },
                        readBy: { $ne: req.params.userId }
                    });
                    return { ...chat._doc, unreadCount };
                }));

                res.status(200).send(chatsWithUnread);
            });
    } catch (error) {
        res.status(400).json(error.message);
    }
});

// Create a group chat
router.post("/group", async (req, res) => {
    if (!req.body.users || !req.body.name || !req.body.adminId) {
        return res.status(400).send({ message: "Please Fill all the fields" });
    }

    var users = JSON.parse(req.body.users);

    if (users.length < 1) {
        return res.status(400).send("More than 1 user is required to form a group chat");
    }

    users.push(req.body.adminId);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.body.adminId,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        res.status(400).json(error.message);
    }
});

// Rename group
router.put("/rename", async (req, res) => {
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
    } else {
        res.json(updatedChat);
    }
});

// Add user to group
router.put("/groupadd", async (req, res) => {
    const { chatId, userId } = req.body;

    const added = await Chat.findByIdAndUpdate(
        chatId,
        { $push: { users: userId } },
        { new: true }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!added) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(added);
    }
});

// Remove user from group
router.put("/groupremove", async (req, res) => {
    const { chatId, userId } = req.body;

    const removed = await Chat.findByIdAndUpdate(
        chatId,
        { $pull: { users: userId } },
        { new: true }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!removed) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(removed);
    }
});

module.exports = router;

const { SOCKET_EVENTS, MESSAGE_STATUS } = require("./utils/constants");
const Message = require("./models/message");
const aiService = require("./services/ai.service");

// Fires up the Socket.IO event listeners
const initializeSocket = (io) => {
    io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
        console.log("Connected to socket.io");

        // When a user connects, join their personal room
        socket.on(SOCKET_EVENTS.SETUP, (userData) => {
            if (!userData || !userData._id) {
                console.warn("Socket setup failed: missing userData or _id");
                return;
            }
            socket.join(userData._id);
            socket.emit(SOCKET_EVENTS.CONNECTED);
        });

        // Let the user join a specific chat room
        socket.on(SOCKET_EVENTS.JOIN_CHAT, (room) => {
            socket.join(room);
            console.log("User Joined Room: " + room);
        });

        // Handle typing status updates
        socket.on(SOCKET_EVENTS.TYPING, (room) => socket.in(room).emit(SOCKET_EVENTS.TYPING));
        socket.on(SOCKET_EVENTS.STOP_TYPING, (room) => socket.in(room).emit(SOCKET_EVENTS.STOP_TYPING));

        // Process AI rewrite requests and send back suggestions
        socket.on(SOCKET_EVENTS.AI.REQUEST_REWRITE, async (data) => {
            try {
                const { text, customPrompt } = typeof data === 'object' ? data : { text: data };
                const suggestions = await aiService.generateRewriteSuggestions(text, customPrompt);
                if (suggestions) {
                    socket.emit(SOCKET_EVENTS.AI.REWRITE_SUGGESTIONS, { original: text, suggestions });
                }
            } catch (error) {
                console.error("Error generating rewrite suggestions:", error);
            }
        });

        // Broadcast new messages to everyone in the chat (except sender)
        socket.on(SOCKET_EVENTS.MESSAGE.NEW, async (newMessageRecieved) => {
            var chat = newMessageRecieved.chat;

            if (!chat.users) return console.log("chat.users not defined");

            chat.users.forEach((user) => {
                if (user._id == newMessageRecieved.sender._id) return;
                socket.in(user._id).emit(SOCKET_EVENTS.MESSAGE.RECEIVED, newMessageRecieved);
            });

        });

        // Mark message as 'delivered' when recipient gets it
        socket.on(SOCKET_EVENTS.MESSAGE.DELIVERED, async ({ messageId, userId }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;

                if (!message.deliveredTo.includes(userId)) {
                    message.deliveredTo.push(userId);

                    if (message.status === MESSAGE_STATUS.SENT) {
                        message.status = MESSAGE_STATUS.DELIVERED;
                    }

                    await message.save();

                    socket.in(message.sender.toString()).emit(SOCKET_EVENTS.MESSAGE.STATUS_UPDATED, {
                        messageId: message._id,
                        status: message.status,
                        deliveredTo: message.deliveredTo
                    });
                }
            } catch (error) {
                console.error("Error updating message delivery status:", error);
            }
        });

        // Mark message as 'read' when recipient opens it
        socket.on(SOCKET_EVENTS.MESSAGE.READ, async ({ messageId, userId }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) return;

                if (!message.readBy.includes(userId)) {
                    message.readBy.push(userId);
                    message.status = MESSAGE_STATUS.READ;
                    await message.save();

                    socket.in(message.sender.toString()).emit(SOCKET_EVENTS.MESSAGE.STATUS_UPDATED, {
                        messageId: message._id,
                        status: message.status,
                        readBy: message.readBy
                    });
                }
            } catch (error) {
                console.error("Error updating message read status:", error);
            }
        });

        // Batch update read status for multiple messages
        socket.on(SOCKET_EVENTS.MESSAGE.BATCH_READ, async ({ messageIds, userId }) => {
            try {
                const messages = await Message.find({ _id: { $in: messageIds } });

                for (const message of messages) {
                    if (!message.readBy.includes(userId)) {
                        message.readBy.push(userId);
                        message.status = MESSAGE_STATUS.READ;
                        await message.save();

                        socket.in(message.sender.toString()).emit(SOCKET_EVENTS.MESSAGE.STATUS_UPDATED, {
                            messageId: message._id,
                            status: message.status,
                            readBy: message.readBy
                        });
                    }
                }
            } catch (error) {
                console.error("Error batch updating read status:", error);
            }
        });

        // Notify chat room about a new reaction
        socket.on(SOCKET_EVENTS.REACTION.ADDED, async ({ messageId, emoji, userId, chatId }) => {
            socket.in(chatId).emit(SOCKET_EVENTS.REACTION.UPDATED, { messageId, emoji, userId });
        });

        // Update chat room when a message is edited
        socket.on(SOCKET_EVENTS.MESSAGE.EDITED, async ({ messageId, content, chatId }) => {
            socket.in(chatId).emit(SOCKET_EVENTS.MESSAGE.UPDATED, { messageId, content, isEdited: true });
        });

        // Notify chat room when a message is deleted
        socket.on(SOCKET_EVENTS.MESSAGE.DELETED, async ({ messageId, chatId }) => {
            socket.in(chatId).emit(SOCKET_EVENTS.MESSAGE.REMOVED, { messageId });
        });

        socket.off(SOCKET_EVENTS.SETUP, () => {
            console.log("USER DISCONNECTED");
        });
    });
};

module.exports = { initializeSocket };

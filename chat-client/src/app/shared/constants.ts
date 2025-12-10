export const SOCKET_EVENTS = {
    CONNECTION: "connection",
    DISCONNECT: "disconnect",
    SETUP: "setup",
    CONNECTED: "connected",
    JOIN_CHAT: "join chat",
    TYPING: "typing",
    STOP_TYPING: "stop typing",
    MESSAGE: {
        NEW: "new message",
        RECEIVED: "message received",
        DELIVERED: "message delivered",
        READ: "message read",
        BATCH_READ: "messages read",
        STATUS_UPDATED: "message status updated",
        EDITED: "message edited",
        UPDATED: "message updated",
        DELETED: "message deleted",
        REMOVED: "message removed",
    },
    REACTION: {
        ADDED: "reaction added",
        UPDATED: "reaction updated"
    },
    AI: {
        REQUEST_REWRITE: "request rewrite",
        REWRITE_SUGGESTIONS: "rewrite suggestions"
    }
};

export const MESSAGE_STATUS = {
    SENT: "sent",
    DELIVERED: "delivered",
    READ: "read"
};

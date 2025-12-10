// One-time migration: add default status, deliveredTo, and readBy fields to old messages

require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("./models/message");

const MONGO_URL = process.env.MONGO_URL;

async function updateExistingMessages() {
    try {
        await mongoose.connect(MONGO_URL);

        const result = await Message.updateMany(
            { status: { $exists: false } },
            {
                $set: {
                    status: "sent",
                    deliveredTo: [],
                    readBy: []
                }
            }
        );


        await mongoose.connection.close();
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

updateExistingMessages();

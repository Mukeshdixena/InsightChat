require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("./models/message");

const MONGO_URL = process.env.MONGO_URL;

async function updateExistingMessages() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("MongoDB connected");

        // Update all messages that don't have status field
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

        console.log(`Updated ${result.modifiedCount} messages with status field`);

        await mongoose.connection.close();
        console.log("Migration complete!");
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

updateExistingMessages();

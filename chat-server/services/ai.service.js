const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/user");

let genAI;
let model;
let aiBotId = null;

const initializeGemini = async () => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-pro" });
        console.log("Gemini AI Initialized");
    } else {
        console.warn("GEMINI_API_KEY is missing. AI Bot will not function.");
    }

    try {
        let bot = await User.findOne({ username: "AI Bot" });
        if (!bot) {
            const hashedPassword = "ai_bot_secure_password_placeholder";
            bot = await User.create({
                username: "AI Bot",
                password: hashedPassword
            });
            console.log("AI Bot user created.");
        }
        aiBotId = bot._id.toString();
        console.log("AI Bot ID:", aiBotId);
    } catch (error) {
        console.error("Error initializing AI Bot:", error);
    }
};

const getAiBotId = () => {
    return aiBotId;
};

const generateResponse = async (prompt, senderName) => {
    if (!model) return null;
    try {
        const fullPrompt = `You are a helpful assistant in a chat app. The user ${senderName} says: "${prompt}". Reply concisely.`;
        const result = await model.generateContent(fullPrompt);
        return result.response.text();
    } catch (error) {
        console.error("Error generating AI response:", error);
        return "I'm having trouble thinking right now. Please try again later.";
    }
};

module.exports = {
    initializeGemini,
    getAiBotId,
    generateResponse
};

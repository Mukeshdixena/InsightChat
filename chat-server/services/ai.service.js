const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/user");

let genAI;
let model;
let aiBotId = null;

const initializeGemini = async () => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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

const rewriteText = async (text, style) => {
    if (!model) return null;
    try {
        let prompt = "";
        switch (style) {
            case 'grammar':
                prompt = `Fix the grammar and spelling of the following text, keeping the tone neutral: "${text}"`;
                break;
            case 'casual':
                prompt = `Rewrite the following text to be more casual and friendly: "${text}"`;
                break;
            case 'formal':
                prompt = `Rewrite the following text to be more formal and professional: "${text}"`;
                break;
            default:
                prompt = `Rewrite the following text: "${text}"`;
        }

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("Error rewriting text:", error);
        return null;
    }
};

const generateRewriteSuggestions = async (text, customPrompt) => {
    if (!model) return null;
    try {
        let prompt = `Rewrite the following text in 3 styles: Grammar (fix grammar/spelling), Casual (friendly), and Formal (professional).`;

        if (customPrompt && customPrompt.trim()) {
            prompt = `Rewrite the following text in 4 styles: Grammar (fix grammar/spelling), Casual (friendly), Formal (professional), and Custom (following this instruction: "${customPrompt}").`;
            prompt += `\nReturn the result correctly formatted as a JSON object with keys: "grammar", "casual", "formal", "custom".`;
        } else {
            prompt += `\nReturn the result correctly formatted as a JSON object with keys: "grammar", "casual", "formal".`;
        }

        prompt += `\nDo not include markdown code block syntax (like \`\`\`json). Just the raw JSON string.\nText: "${text}"`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(responseText);
    } catch (error) {
        console.error("Error generating rewrite suggestions:", error);
        return null;
    }
};

module.exports = {
    initializeGemini,
    getAiBotId,
    generateResponse,
    rewriteText,
    generateRewriteSuggestions
};

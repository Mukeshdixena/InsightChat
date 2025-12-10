// controllers/aiController.js

const aiService = require("../services/ai.service");

// Controller for rewriting text
exports.rewriteText = async (req, res) => {
    const { text, style } = req.body;

    if (!text || !style) {
        return res.status(400).json({ error: "Text and style are required" });
    }

    try {
        const rewrittenText = await aiService.rewriteText(text, style);

        if (rewrittenText) {
            return res.json({ rewrittenText });
        }

        return res.status(500).json({ error: "Failed to rewrite text" });
    } catch (error) {
        console.error("Error in rewriteText controller:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

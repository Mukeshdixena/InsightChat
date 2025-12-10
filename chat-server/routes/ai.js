// Route for rewriting text using Gemini AI

const express = require("express");
const router = express.Router();
const aiService = require("../services/ai.service");

// Handle rewrite requests
router.post("/rewrite", async (req, res) => {
    const { text, style } = req.body;

    if (!text || !style) {
        return res.status(400).json({ error: "Text and style are required" });
    }

    try {
        const rewrittenText = await aiService.rewriteText(text, style);
        if (rewrittenText) {
            res.json({ rewrittenText });
        } else {
            res.status(500).json({ error: "Failed to rewrite text" });
        }
    } catch (error) {
        console.error("Error in /rewrite endpoint:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;

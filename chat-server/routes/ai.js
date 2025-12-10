// routes/aiRoutes.js

const express = require("express");
const router = express.Router();

const aiController = require("../controllers/aiController");

// POST /rewrite
router.post("/rewrite", aiController.rewriteText);

module.exports = router;

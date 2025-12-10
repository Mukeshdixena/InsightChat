// routes/authRoutes.js

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const authController = require("../controllers/authController");

// Search users
router.get("/users", authController.searchUsers);

// Signup
router.post("/signup", authController.signup);

// Login
router.post("/login", authController.login);

// Update user
router.put("/update", auth, authController.updateUser);

module.exports = router;

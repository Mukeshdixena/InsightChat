const express = require("express");
const router = express.Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");

// Search Users
router.get("/users", async (req, res) => {
  const keyword = req.query.search
    ? {
      username: { $regex: req.query.search, $options: "i" },
    }
    : {};

  // Exclude self if we had req.user, but this is a public endpoint or we need to middleware it.
  // For simplicity lets just return all matches.
  const users = await User.find(keyword);
  res.send(users);
});

router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const exist = await User.findOne({ username });
    if (exist) return res.status(400).json({ message: "User exists" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash });

    // Return token immediately for better UX? Or just message
    res.json({ message: "Signup successful", userId: user._id });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret");
    res.json({ token, userId: user._id });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

router.put("/update", auth, async (req, res) => {
  try {
    const { username, password } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updateData.password = hash;
    }

    await User.findByIdAndUpdate(req.user.id, updateData);
    res.json({ message: "Updated successfully" });

  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router;

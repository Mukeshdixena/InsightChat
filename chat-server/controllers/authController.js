// controllers/authController.js

const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Search users by username
exports.searchUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? { username: { $regex: req.query.search, $options: "i" } }
      : {};

    const users = await User.find(keyword);
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: "Search failed", error: err.message });
  }
};

// User signup
exports.signup = async (req, res) => {
  try {
    const { username, password } = req.body;

    const exist = await User.findOne({ username });
    if (exist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash });

    return res.json({ message: "Signup successful", userId: user._id });
  } catch (err) {
    return res.status(500).json({ message: "Signup failed", error: err.message });
  }
};

// User login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secret"
    );

    return res.json({ token, userId: user._id });
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// Update username or password
exports.updateUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updateData.password = hash;
    }

    await User.findByIdAndUpdate(req.user.id, updateData);

    return res.json({ message: "Updated successfully" });

  } catch (err) {
    return res.status(500).json({ message: "Update failed", error: err.message });
  }
};

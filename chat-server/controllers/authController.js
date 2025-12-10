// controllers/authController.js
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Search users by username
// @route   GET /auth/search?search=keyword
// @access  Public
exports.searchUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? { username: { $regex: req.query.search, $options: "i" } }
    : {};

  const users = await User.find(keyword).select("-password"); // Exclude password
  res.json(users);
});

// @desc    Register a new user
// @route   POST /auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400);
    throw new Error("Please provide username and password");
  }

  const userExists = await User.findOne({ username });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    username,
    password: hashedPassword,
  });

  if (user) {
    res.json({
      message: "Signup successful",
      userId: user._id,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Authenticate user & get token
// @route   POST /auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400);
    throw new Error("Please provide username and password");
  }

  const user = await User.findOne({ username });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      token: generateToken(user._id),
      userId: user._id,
      username: user.username,
    });
  } else {
    res.status(401);
    throw new Error("Invalid credentials");
  }
});

// @desc    Update user profile
// @route   PUT /auth/update
// @access  Private
exports.updateUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findById(req.user.id);

  if (user) {
    user.username = username || user.username;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();

    res.json({
      message: "Updated successfully",
      user: {
        _id: updatedUser._id,
        username: updatedUser.username
      }
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// Generate JWT
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true }, // Sparse allows null/undefined to be non-unique if not provided
  password: { type: String, required: true },
  pic: {
    type: String,
    default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);

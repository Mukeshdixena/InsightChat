const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: { type: String, trim: true },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  }],

  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },

  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);

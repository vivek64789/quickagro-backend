const mongoose = require("mongoose");

const chatMessageSchema = mongoose.Schema({
  chatId: {
    type: String,
  },
  senderIsAdmin: {
    type: Boolean,
  },
  message: {
    type: String,
  },
  isImage: {
    type: Boolean,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);

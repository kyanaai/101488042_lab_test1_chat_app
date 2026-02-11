const mongoose = require("mongoose");

const groupMessageSchema = new mongoose.Schema({
  from_user: {
    type: String,
    required: true
  },
  room: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  date_sent: {
    type: String,
    default: () => {
      return new Date().toLocaleString("en-CA");
    }
  }
});

module.exports = mongoose.model("GroupMessage", groupMessageSchema);
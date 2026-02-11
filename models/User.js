const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  createon: {
    type: String,
    default: () => {
      return new Date().toLocaleString("en-CA");
    }
  }
});

module.exports = mongoose.model("User", userSchema);
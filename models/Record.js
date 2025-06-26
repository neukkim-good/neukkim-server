const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "User",
  },
  score: {
    type: Number,
    default: 0,
  },
  time: {
    type: Date,
    default: Date.now,
  },
});

const Record = mongoose.model("Record", recordSchema, "Record");

module.exports = Record;

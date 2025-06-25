const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  score: { type: Number, default: 0 },
  time: { type: Date, default: Date.now },
});
const Record = mongoose.model("Record", recordSchema);
module.exports = Record;

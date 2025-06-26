const mongoose = require("mongoose");

const gameResultSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  score: { type: Number, default: 0 },
});
const GameResult = mongoose.model("GameResult", gameResultSchema);
module.exports = GameResult;

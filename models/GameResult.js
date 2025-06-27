const mongoose = require("mongoose");

const gameResultSchema = new mongoose.Schema({
  room_id: { type: mongoose.Types.ObjectId, required: true, ref: "Room" },
  user_id: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  score: { type: Number, default: 0 },
  endTime: { type: Date },
  endTime: { type: Date, required: true }, //endTime 추가
});
const GameResult = mongoose.model("GameResult", gameResultSchema, "GameResult");
module.exports = GameResult;

// const mongoose = require("mongoose");

// const recordSchema = new mongoose.Schema({
//   user_id: {
//     type: mongoose.Types.ObjectId,
//     required: true,
//     ref: "User",
//   },
//   score: {
//     type: Number,
//     default: 0,
//   },
//   time: {
//     type: Date,
//     default: Date.now,
//   },
// });

// const Record = mongoose.model("Record", recordSchema, "Record");

// module.exports = Record;

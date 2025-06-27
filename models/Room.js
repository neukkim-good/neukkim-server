const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  title: { type: String, required: true },
  maxUser: { type: Number, required: true },
  host_id: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  endTime: { type: Date, required: true },
  board: { type: [Number], required: true }, // board는 숫자 배열
});

const Room = mongoose.model("Room", roomSchema, "Room");
module.exports = Room;

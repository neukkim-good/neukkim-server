const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  title: { type: String, required: true },
  maxUser: { type: Number, required: true },
  host_id: { type: String, required: true },
  endTime: { type: Date, required: true },
  board: { type: [Number], required: true }, // board는 다양한 형식이 가능하므로 Mixed로 처리
});

const Room = mongoose.model("Room", roomSchema, "Room");
module.exports = Room;

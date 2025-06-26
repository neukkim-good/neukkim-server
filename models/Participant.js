const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  room_id: { type: mongoose.Types.ObjectId, ref: "Room", required: true },
  user_id: { type: mongoose.Types.ObjectId, ref: "User", required: true },
});

const Participant = mongoose.model(
  "Participant",
  participantSchema,
  "Participant"
);
module.exports = Participant;

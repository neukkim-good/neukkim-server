const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  room_id: { type: String, required: true },
  user_id: { type: String, required: true },
});

const Participant = mongoose.model(
  "Participant",
  participantSchema,
  "Participant"
);
module.exports = Participant;

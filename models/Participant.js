const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  room_id: { type: mongoose.Types.ObjectId, required: true },
  user_id: { type: mongoose.Types.ObjectId, required: true },
});

const Participant = mongoose.model(
  "Participant",
  participantSchema,
  "Participant"
);
module.exports = Participant;

var express = require("express");
const Room = require("../models/Room");
const Participant = require("../models/Participant"); // 추가 필요
var router = express.Router();

// 방 리스트 출력
router.get("/", async function (req, res, next) {
  try {
    // 현재 시간보다 이후인 방만 필터링
    const list = await Room.find({
      endTime: { $gt: new Date() },
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 방 입장하기
router.post("/participate/:room_id", async function (req, res, next) {
  const { user_id } = req.body;
  const { room_id } = req.params;
  // 현재 방의 참가자 수 확인
  const participantCount = await Participant.countDocuments({ room_id });

  // 방 정보 가져오기
  const room = await Room.findById(room_id);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  // 이미 참가한 사용자인지 확인
  const existingParticipant = await Participant.findOne({
    room_id,
    user_id,
  });
  if (existingParticipant) {
    return res.status(200).json("재입장 했습니다.");
  }

  // 방이 가득 찬 경우
  if (participantCount >= room.maxUser) {
    return res.status(400).json({ error: "방이 가득 찼습니다." });
  }

  // 참가자 추가
  const newParticipant = await Participant.create({
    room_id,
    user_id,
  });

  res.json({
    message: "방에 성공적으로 참가했습니다.",
    participant: newParticipant,
  });
});

// 방 만들기
router.post("/", async function (req, res, next) {
  try {
    const data = req.body;

    const appleArr = [];
    for (let i = 0; i < 170; i++) {
      appleArr.push(Math.floor(Math.random() * 9) + 1);
    }

    // 방 데이터 생성
    const newRoom = await Room.create({
      title: data.title,
      maxUser: data.maxUser,
      host_id: data.host_id,
      endTime: data.endTime,
      board: appleArr,
    });

    // 방 생성 후 자동으로 생성된 _id 사용 가능
    const room_id = newRoom._id.toString(); // ObjectId를 문자열로 변환

    // Participant 테이블에 호스트 추가
    const hostParticipant = await Participant.create({
      room_id: room_id,
      user_id: data.host_id,
    });

    res.json({
      message: "방이 성공적으로 생성되었습니다.",
      room: newRoom,
      hostParticipant: hostParticipant,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

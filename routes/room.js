var express = require("express");
const Room = require("../models/Room");
const User = require("../models/User");
const GameResult = require("../models/GameResult");
const Participant = require("../models/Participant"); // 추가 필요
const { verifyToken } = require("../utils/auth");
const { default: mongoose } = require("mongoose");
var router = express.Router();

// 방 리스트 출력
router.get("/", async function (req, res, next) {
  try {
    // 현재 시간보다 이후인 방만 필터링
    const list = await Room.aggregate([
      {
        //우선 날짜가 지나지 않은 방들만 뽑아내기
        $match: { endTime: { $gt: new Date() } },
      },
      {
        //participant 컬렉션과 조인해서 인원 뽑아내기 방 아이디(_id)를 사용해서.
        $lookup: {
          from: "Participant",
          localField: "_id", //Room의 필드값
          foreignField: "room_id", //participant의 필드값
          as: "enteredUser",
        },
      },
      {
        $addFields: {
          currentUser: { $size: "$enteredUser" },
        },
      },
      // $project - 불필요한 필드 제거
      {
        $project: {
          enteredUser: 0, // joinedParticipants 배열 제거
        },
      },
    ]);
    // console.log(list);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//=====================================================
//Participant 출력 테스트용임
router.post("/test", async function (req, res, next) {
  const { room_id } = req.body;
  const obj_id = new mongoose.Types.ObjectId(room_id);
  try {
    const list = await Participant.find({ room_id }); // 조건 없이 전체 출력
    // console.log(list);
    res.json({ count: list.length, participants: list });
  } catch (err) {
    next(err);
  }
});

//=====================================================
// 방 입장하기
router.post("/participate/:room_id", async function (req, res, next) {
  const { room_id } = req.params;

  // 1) 토큰 꺼내기
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "토큰이 없습니다." });
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "잘못된 토큰 형식입니다." });
  }

  // 2) 토큰 검증
  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: "유효하지 않은 토큰입니다." });
  }

  // 3) 현재 방의 참가자 수 확인
  const participantCount = await Participant.countDocuments({ room_id });

  // 4) 방 정보 가져오기
  const room = await Room.findById(room_id);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  // 이미 참가한 사용자인지 확인
  const existingParticipant = await Participant.findOne({
    room_id: room_id,
    user_id: user._id,
  });
  if (existingParticipant) {
    return res.status(202).json("reEnter");
  }

  // 방이 가득 찬 경우
  if (participantCount >= room.maxUser) {
    return res.status(400).json({ error: "방이 가득 찼습니다." });
  }

  // 참가자 추가
  const newParticipant = await Participant.create({
    room_id: room_id,
    user_id: user._id,
  });

  res.json({
    message: "방에 성공적으로 참가했습니다.",
    participant: newParticipant,
  });
});

//=====================================================
// 방 만들기
router.post("/", async (req, res, next) => {
  // 1) 토큰 꺼내기
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "토큰이 없습니다." });
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "잘못된 토큰 형식입니다." });
  }

  // 2) 토큰 검증
  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: "유효하지 않은 토큰입니다." });
  }

  // 3) 방 생성 로직
  const data = req.body;
  const appleArr = Array.from(
    { length: 170 },
    () => Math.floor(Math.random() * 9) + 1
  );

  const newRoom = await Room.create({
    title: data.title,
    maxUser: data.maxUser,
    host_id: new mongoose.Types.ObjectId(user._id),
    endTime: data.endTime,
    board: appleArr,
  });

  // 4) 방장도 Participant에 추가
  const hostParticipant = await Participant.create({
    room_id: newRoom._id,
    user_id: newRoom.host_id,
  });

  res.json({
    message: "방이 성공적으로 생성되었습니다.",
    room: newRoom,
    hostParticipant,
  });
});

//=====================================================
// 내기 방 상세정보 가져오기
router.get("/:room_id", async (req, res, next) => {
  const { room_id } = req.params;

  // 1) 토큰 꺼내기
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "토큰이 없습니다." });
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "잘못된 토큰 형식입니다." });
  }

  // 2) 토큰 검증
  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: "유효하지 않은 토큰입니다." });
  }

  // console.log("토큰 검증 성공 - 사용자 정보: ", user);

  try {
    // 3) 방 정보 가져오기
    const room = await Room.findById(room_id);
    // console.log("방 ID: ", room_id);
    if (!room) {
      return res.status(404).json({ error: "방을 찾을 수 없습니다." });
    }
    // console.log("방 정보: ", room);

    // 4) 참가자 정보 가져오기
    const participants = await Participant.find({ room_id: room._id });
    console.log("참가자 목록: ", participants);

    // 5) 응답 데이터 생성
    const userIds = participants.map((p) => p.user_id.toString());
    const users = await User.find({ _id: { $in: userIds } });
    // console.log("유저 정보 목록: ", users);

    const userList = users.map((u) => u.nickname);

    // console.log("유저 리스트: ", userList);
    // console.log("사과게임 판: ", room.board);

    const isHost = user._id.toString() === room.host_id.toString();

    res.json({
      is_host: isHost,
      title: room.title,
      user_list: userList,
      board: room.board,
    });
  } catch (error) {
    console.log("방 상세정보 가져오기 실패: ", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

//=====================================================
// 내기 방 결과 내보내기
router.post("/:room_id", async (req, res, next) => {
  const { score } = req.body;
  const { room_id } = req.params;

  // 1) 토큰 꺼내기
  const authHeader = req.headers["bearer-token"];
  if (!authHeader) {
    return res.status(401).json({ error: "토큰이 없습니다." });
  }

  const token = authHeader.replace("Bearer ", "");

  // 2) 토큰 검증
  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: "유효하지 않은 토큰입니다." });
  }

  // console.log("토큰 검증 성공 - 사용자 정보: ", user);

  const result = await GameResult.create({
    user_id: user._id.toString(),
    room_id: room_id,
    score: score,
    endTime: new Date(), // 이거 room_id로 방 검색해서 endTime 가져와야됨.
  });

  res.json({
    message: "내가 결과를 저장 완료",
    result,
  });
});

module.exports = router;

var express = require("express");
var router = express.Router();
const User = require("../models/User");
const Record = require("../models/Record");
const GameResult = require("../models/GameResult");
const Room = require("../models/Room");
const { authenticate } = require("../middleware/auth");
router.use(authenticate);
// 오늘 최고 기록 / 주간 최고 기록 / 주간 평균 기록
// 개인 기록                    내기 기록
// 2020.10.10.14:00 120점      2020. 10. 10. 14:00 방제목 멤버:() 등수:() 120점

//mypage에서 내 개인기록 가져오기
router.get("/record", async function (req, res) {
  // 변경 전: /record/:userId
  try {
    // 변경 전: const { userId } = req.params;
    const userId = req.user._id; // 변경 후: 토큰에서 인증된 사용자 ID를 가져옵니다.

    const records = await Record.find({ user_id: userId }).sort({ time: -1 });
    res.status(200).json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//mypage에서 내 내기기록 가져오기
//userId로 gameresult를 조회, gameresult의 roomId로 Room을 조회 후 title, endtime가져옴
//Gameresult 중 roomId가 일치하는 컬럼들을 찾아서
// 그 컬럼들의 userId로 usernickname을 찾는다.
// 그 컬럼들의 점수를 비교하여 등수를 찾는다.
// mypage에서 내 내기기록 가져오기
router.get("/gameresult", async function (req, res) {
  // 변경 전: /gameresult/:userId
  try {
    // 변경 전: const { userId } = req.params;
    const userId = req.user._id; // 변경 후: 토큰에서 인증된 사용자 ID를 가져옵니다.

    const myGameResults = await GameResult.find({ userId: userId }).sort({
      time: -1,
    });

    if (!myGameResults || myGameResults.length === 0) {
      return res.status(200).json([]);
    }

    const detailedResults = [];

    for (const myResult of myGameResults) {
      const roomInfo = await Room.findById(myResult.roomId);
      if (!roomInfo) continue;

      const allPlayersInRoom = await GameResult.find({
        roomId: myResult.roomId,
      })
        .populate("userId", "nickname")
        .sort({ score: -1 });

      const myRank =
        allPlayersInRoom.findIndex((p) => p.userId._id.toString() === userId) +
        1;

      detailedResults.push({
        roomId: roomInfo._id,
        title: roomInfo.title,
        endtime: roomInfo.endtime,
        myRank: myRank,
        myScore: myResult.score,
        totalParticipants: allPlayersInRoom.length,
        participants: allPlayersInRoom.map((player, index) => ({
          nickname: player.userId.nickname,
          score: player.score,
          rank: index + 1,
        })),
      });
    }

    res.status(200).json(detailedResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//mypage에서 닉네임 바꾸기
router.put("/nickname", async function (req, res) {
  // 변경 전: /:userId
  try {
    // 변경 전: const { userId } = req.params;
    const userId = req.user._id; // 변경 후: 토큰에서 인증된 사용자 ID를 가져옵니다.
    const { nickname } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { nickname: nickname },
      { new: true } // 업데이트된 문서를 반환
    ).select("-password"); // 보안을 위해 비밀번호 필드는 제외하고 반환

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error" });
  }
});

//로그인한 유저 조회
router.get("/me", async function (req, res) {
  // 변경 전: /user/:userId
  try {
    // 변경 전: const { userId } = req.params;
    const userId = req.user._id; // 변경 후: 토큰에서 인증된 사용자 ID를 가져옵니다.

    // findById가 단일 문서를 반환하므로 더 적합합니다.
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

var express = require("express");
const mongoose = require("mongoose");
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
    const userIdString = userId.toString();
    const records = await Record.find({ user_id: userIdString }).sort({
      time: -1,
    });
    //console.log(records);
    res.status(200).json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/gameresult", async function (req, res) {
  try {
    // 1. 토큰에서 사용자 ID (ObjectId)를 가져옵니다.
    const userIdObject = req.user._id;
    console.log(userIdObject);
    // 2. 해당 사용자가 참여한 모든 게임 결과를 DB에서 찾습니다.
    const myGameResults = await GameResult.find({
      user_id: userIdObject,
    }).sort({
      _id: -1, // 최신 게임부터 정렬
    });
    console.log(`GameResult: ${myGameResults}`);
    if (!myGameResults || myGameResults.length === 0) {
      return res.status(200).json([]); // 결과가 없으면 빈 배열 반환
    }

    // 3. 각 게임 결과에 대한 상세 정보를 병렬로 처리하여 가져옵니다.
    const detailedResultsPromises = myGameResults.map(async (myResult) => {
      const roomInfo = await Room.findById(myResult.room_id);
      if (!roomInfo) return null; // 방 정보가 없으면 이 결과는 건너뜀

      const allPlayersInRoom = await GameResult.find({
        room_id: myResult.room_id,
      })
        .populate("user_id", "nickname")
        .sort({ score: -1 }); // 점수 내림차순 (랭킹)

      const myRank =
        allPlayersInRoom.findIndex(
          (p) =>
            p.user_id && p.user_id._id.toString() === userIdObject.toString()
        ) + 1;

      if (myRank === 0) return null; // 데이터 오류로 방에 내가 없으면 제외

      // --- [수정] 프론트엔드 타입 정의에 맞춰 응답 객체 구성 ---
      return {
        result_id: myResult._id.toString(), // 추가: GameResult 문서의 고유 ID
        title: roomInfo.title,
        endTime: roomInfo.endTime,
        totalParticipants: allPlayersInRoom.length,
        myRank: myRank,
        myScore: myResult.score,
        participants: allPlayersInRoom.map((player, index) => ({
          nickname: player.user_id
            ? player.user_id.nickname
            : "알 수 없는 유저",
          score: player.score,
          rank: index + 1,
        })),
        room_id: roomInfo._id.toString(), // 수정: 필드명 변경 (roomId -> room_id)
        user_id: userIdObject.toString(), // 추가: 내 사용자 ID
        score: myResult.score, // 추가: 내 점수 (myScore와 동일)
      };
    });

    const detailedResults = (await Promise.all(detailedResultsPromises)).filter(
      (result) => result !== null
    );

    res.status(200).json(detailedResults);
  } catch (error) {
    console.error("Error in /gameresult:", error);
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

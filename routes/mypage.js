var express = require("express");
var router = express.Router();
const User = require("../models/User");
const Record = require("../models/Record");
const GameResult = require("../models/GameResult");
const Room = require("../models/Room");
// 오늘 최고 기록 / 주간 최고 기록 / 주간 평균 기록
// 개인 기록                    내기 기록
// 2020.10.10.14:00 120점      2020. 10. 10. 14:00 방제목 멤버:() 등수:() 120점

//mypage에서 내 개인기록 가져오기
router.get("/record/:userId", async function (req, res) {
  try {
    const { userId } = req.params;

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
router.get("/gameresult/:userId", async function (req, res) {
  try {
    const { userId } = req.params;

    // 1. 현재 사용자의 모든 게임 참여 기록(GameResult)을 조회합니다.
    const myGameResults = await GameResult.find({ userId: userId }).sort({
      time: -1,
    });

    if (!myGameResults || myGameResults.length === 0) {
      // 참여한 게임이 없으면 빈 배열을 반환합니다.
      return res.status(200).json([]);
    }

    // 최종적으로 클라이언트에 보낼 상세 기록들을 담을 배열
    const detailedResults = [];

    // for...of 루프는 내부에서 await를 사용하기에 적합합니다.
    for (const myResult of myGameResults) {
      // 2. 각 게임 기록의 roomId로 Room 정보를 조회합니다.
      const roomInfo = await Room.findById(myResult.roomId);
      if (!roomInfo) continue; // 해당 방 정보가 없으면 이 기록은 건너뜁니다.

      // 3. 같은 방(roomId)에 참여한 모든 사용자의 결과를 조회합니다.
      //    점수(score)를 기준으로 내림차순 정렬하여 등수를 미리 계산합니다.
      //    .populate()를 사용하여 각 결과의 userId를 실제 User 문서(의 nickname)로 대체합니다.
      const allPlayersInRoom = await GameResult.find({
        roomId: myResult.roomId,
      })
        .populate("userId", "nickname") // userId 필드를 User 모델과 연결해 nickname만 가져옴
        .sort({ score: -1 });

      // 4. 정렬된 결과에서 현재 사용자의 등수를 찾습니다. (배열 index + 1)
      const myRank =
        allPlayersInRoom.findIndex((p) => p.userId._id.toString() === userId) +
        1;

      // 5. 최종 응답에 필요한 데이터들을 하나의 객체로 조합합니다.
      detailedResults.push({
        roomId: roomInfo._id,
        title: roomInfo.title,
        endtime: roomInfo.endtime,
        myRank: myRank,
        myScore: myResult.score,
        totalParticipants: allPlayersInRoom.length,
        // 참여자 목록 (닉네임, 점수, 등수)
        participants: allPlayersInRoom.map((player, index) => ({
          nickname: player.userId.nickname,
          score: player.score,
          rank: index + 1, // 정렬된 순서가 등수
        })),
      });
    }

    // 6. 조합된 최종 결과를 응답으로 보냅니다.
    res.status(200).json(detailedResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//mypage에서 닉네임 바꾸기
router.put("/:userId", async function (req, res) {
  try {
    const { userId } = req.params;
    const { nickname } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { nickname: nickname },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    // 에러 처리
    console.error(error);
    res.status(500).send({ message: "Server error" });
  }
});

//유저한명 조회
router.get("/user/:userId", async function (req, res) {
  try {
    const { userId } = req.params;

    const user = await User.find({ _id: userId });
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

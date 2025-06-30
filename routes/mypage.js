var express = require("express");
const mongoose = require("mongoose");
var router = express.Router();
const User = require("../models/User");
const Record = require("../models/Record");
const GameResult = require("../models/GameResult");
const Room = require("../models/Room");
const { authenticate } = require("../middleware/auth");
const Participant = require("../models/Participant");
router.use(authenticate);

router.get("/record/today", async function (req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: "사용자 인증 정보를 찾을 수 없습니다. 로그인이 필요합니다.",
      });
    }

    const userId = req.user._id;

    // UTC 기준 날짜 설정
    const now = new Date();
    const startOfTodayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    const endOfTodayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    // 개인 기록 검색
    const personalRecord = await Record.findOne({
      user_id: userId,
      time: { $gte: startOfTodayUTC, $lte: endOfTodayUTC },
    }).sort({ score: -1 });

    const recordMaxScore = personalRecord ? personalRecord.score : 0;

    // 4. 내기방 최고 기록 검색
    const gameResultRecord = await GameResult.findOne({
      user_id: userId,
      endTime: { $gte: startOfTodayUTC, $lte: endOfTodayUTC }, // 수정 1: 'time' -> 'endTime'
    }).sort({ score: -1 });

    // gameResultRecord 객체에서 score를 추출하고, 결과가 없으면 0으로 처리
    const gameResultMaxScore = gameResultRecord ? gameResultRecord.score : 0;

    // 두 '점수'를 비교하기 위해 Math.max 사용
    const todayMaxScore = Math.max(recordMaxScore, gameResultMaxScore);

    res.status(200).json({
      todayMaxScore: todayMaxScore, // 소수점 반올림
    });
  } catch (error) {
    console.error("\n*** 에러 발생 ***:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 주간 기록
router.get("/record/weekly", async function (req, res) {
  try {
    // 1. 사용자 ID 검증 및 ObjectId로 변환
    if (!req.user || !req.user._id) {
      return res
        .status(401)
        .json({ message: "사용자 인증 정보를 찾을 수 없습니다." });
    }
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // 2. UTC 기준 최근 7일 날짜 범위 설정
    const now = new Date();
    // 오늘의 끝 시각
    const endOfTodayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );
    // 7일 전의 시작 시각 (오늘 제외, 꽉 채운 7일)
    const sevenDaysAgoUTC = new Date(endOfTodayUTC);
    sevenDaysAgoUTC.setUTCDate(sevenDaysAgoUTC.getUTCDate() - 7);
    sevenDaysAgoUTC.setUTCHours(0, 0, 0, 0);

    // 3. 개인 기록(Record)과 내기 기록(GameResult)의 주간 통계를 동시에 조회 (Promise.all)
    const [personalStats, gameResultStats] = await Promise.all([
      // 3-1. 개인 기록(Record)의 주간 통계 (최고, 평균)
      Record.aggregate([
        {
          $match: {
            user_id: userId,
            time: { $gte: sevenDaysAgoUTC, $lte: endOfTodayUTC },
          },
        },
        {
          $group: {
            _id: null, // 모든 결과를 하나의 그룹으로
            maxScore: { $max: "$score" },
            avgScore: { $avg: "$score" },
          },
        },
      ]),
      // 3-2. 내기 기록(GameResult)의 주간 통계 (최고, 평균)
      GameResult.aggregate([
        {
          $match: {
            user_id: userId,
            endTime: { $gte: sevenDaysAgoUTC, $lte: endOfTodayUTC },
          },
        },
        {
          $group: {
            _id: null, // 모든 결과를 하나의 그룹으로
            maxScore: { $max: "$score" },
            avgScore: { $avg: "$score" },
          },
        },
      ]),
    ]);

    // 4. 각 통계 결과에서 값 추출 (기록이 없으면 0)
    const personalMax =
      personalStats.length > 0 ? personalStats[0].maxScore : 0;
    const personalAvg =
      personalStats.length > 0 ? personalStats[0].avgScore : 0;

    const gameResultMax =
      gameResultStats.length > 0 ? gameResultStats[0].maxScore : 0;
    const gameResultAvg =
      gameResultStats.length > 0 ? gameResultStats[0].avgScore : 0;

    // 5. 최종 통계 계산
    const weeklyMaxScore = Math.max(personalMax, gameResultMax);

    // 평균 점수 계산 (기록이 있는 경우에만 평균 계산에 포함)
    const scoresToAverage = [];
    if (personalStats.length > 0) scoresToAverage.push(personalAvg);
    if (gameResultStats.length > 0) scoresToAverage.push(gameResultAvg);
    const weeklyAverageScore =
      scoresToAverage.length > 0
        ? scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length
        : 0;

    res.status(200).json({
      weeklyMaxScore,
      weeklyAverageScore: Math.round(weeklyAverageScore), // 소수점 반올림
    });
  } catch (error) {
    console.error("주간 기록 조회 중 에러 발생:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 개인 기록                    내기 기록
// 2020.10.10.14:00 120점      2020. 10. 10. 14:00 방제목 멤버:() 등수:() 120점

//mypage에서 내 개인기록 가져오기
router.get("/record", async function (req, res) {
  try {
    const userId = req.user._id;
    const userIdString = userId.toString();
    const records = await Record.find({ user_id: userIdString }).sort({
      time: -1,
    });
    res.status(200).json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/gameresult", async function (req, res) {
  try {
    const userIdObject = req.user._id;
    const myGameResults = await GameResult.find({
      user_id: userIdObject,
    }).sort({
      _id: -1, // 최신 게임부터 정렬
    });
    if (!myGameResults || myGameResults.length === 0) {
      return res.status(200).json([]); // 결과가 없으면 빈 배열 반환
    }

    const detailedResultsPromises = myGameResults.map(async (myResult) => {
      const roomInfo = await Room.findById(myResult.room_id);
      if (!roomInfo) return null;

      const allPlayersInRoom = await GameResult.find({
        room_id: myResult.room_id,
      })
        .populate("user_id", "nickname")
        .sort({ score: -1 });

      const myRank =
        allPlayersInRoom.findIndex(
          (p) =>
            p.user_id && p.user_id._id.toString() === userIdObject.toString()
        ) + 1;

      if (myRank === 0) return null;

      return {
        result_id: myResult._id.toString(),
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
        room_id: roomInfo._id.toString(),
        user_id: userIdObject.toString(),
        score: myResult.score, // 내 점수 (myScore와 동일)
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
  try {
    const userId = req.user._id;
    const { nickname } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { nickname: nickname },
      { new: true } // 업데이트된 문서 반환
    ).select("-password"); // 비밀번호 제외하고 반환

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
  try {
    const userId = req.user._id;

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

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Record = require("../models/Record");
const User = require("../models/User");
const GameResult = require("../models/GameResult");

router.get("/", async function (req, res, next) {
  try {
    const now = new Date();
    const todayStart = new Date(now.setUTCHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setUTCHours(23, 59, 59, 999));

    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay()); // 일욜

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6); // 토욜
    weekEnd.setUTCHours(23, 59, 59, 999);

    // 1. dayRank
    const dayRank = await Record.aggregate([
      { $match: { time: { $gte: todayStart, $lte: todayEnd } } },
      {
        $lookup: {
          from: "User",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          user_id: 1,
          score: 1,
          nickname: "$user.nickname",
        },
      },
      { $sort: { score: -1 } },
    ]);

    // 2. weekRank (이번 주 전체 기록 중 점수 순)
    const weekRank = await Record.aggregate([
      {
        $match: {
          time: { $gte: weekStart, $lte: weekEnd },
        },
      },
      {
        $lookup: {
          from: "User",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          user_id: 1,
          score: 1,
          nickname: "$user.nickname",
        },
      },
      {
        $sort: { score: -1 }, // 점수 순 정렬
      },
    ]);

    // 3. meanRank
    const meanRank = await Record.aggregate([
      {
        $group: {
          _id: "$user_id",
          mean: { $avg: "$score" },
        },
      },
      {
        $lookup: {
          from: "User",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          user_id: "$_id",
          mean: { $round: ["$mean", 2] },
          nickname: "$user.nickname",
        },
      },
      { $sort: { mean: -1 } },
    ]);

    // 4. GameResult에서 승률 계산
    // GameResult에는 각 room_id 별 user_id와 score가 저장되어있음
    // GameResult에서 승리한 사람을 찾기 위해선, 점수별로 정렬한 후에, GameResult에서 room_id별로 최고 점수를 가진 user_id를 찾아야함
    // 그렇게 하면, room_id에 따른 승리한 사람을 구할 수 있음
    // winRateRank는 GameResult에서 각 room_id마다 최고 점수를 가진 user_id를 찾아서, 그 user_id의 닉네임과 함께 반환

    // 4.1 sort 해서 우승자 count 하기
    const gameResults = await GameResult.aggregate([
      {
        $group: {
          _id: "$room_id",
          winner: { $first: "$user_id" }, // 각 room_id에서 첫 번째 user_id를 우승자로 간주
          maxScore: { $max: "$score" }, // 최고 점수
        },
      },
      {
        $lookup: {
          from: "User",
          localField: "winner",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          user_id: "$winner",
          nickname: "$user.nickname",
          score: "$maxScore",
        },
      },
      { $sort: { score: -1 } }, // 점수 순 정렬
    ]);
    // 4.2 승률 계산 배열로 바꿔야함
    const winRateRank = gameResults.reduce((acc, result) => {
      const userId = result.user_id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          nickname: result.nickname,
          wins: 0,
          total: 0,
        };
      }
      acc[userId].wins += 1; // 승리 횟수 증가
      return acc;
    }, {});

    // 4.3 user_id 별 총 게임 수 계산
    const totalGames = await GameResult.aggregate([
      {
        $group: {
          _id: "$user_id",
          total: { $sum: 1 }, // 각 user_id의 총 게임 수
        },
      },
    ]);

    // 4.4 총 게임 수를 활용해 승률 계산
    const winRateRankArray = Object.values(winRateRank)
      .map((user) => {
        const totalGame = totalGames.find(
          (game) => game._id.toString() === user.user_id
        );
        const total = totalGame ? totalGame.total : 0;
        return {
          _id: user.user_id,
          user_id: user.user_id,
          nickname: user.nickname,
          score:
            total > 0 ? parseFloat(((user.wins / total) * 100).toFixed(2)) : 0, // 승률 계산
        };
      })
      .sort((a, b) => b.score - a.score);

    res.json({
      dayRank,
      weekRank,
      meanRank,
      winRateRankArray,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/notify", async function (req, res, next) {
  try {
    const notifyResult = await GameResult.aggregate([
      // 1. Room 컬렉션에서 endTime 가져오기
      {
        $lookup: {
          from: "User",
          localField: "user_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      // 2. room_id 별 그룹화하기
      {
        $group: {
          _id: "$room_id",
          endTime: { $first: "$endTime" },
          user_list: {
            $push: {
              nickname: "$userInfo.nickname",
              score: "$score",
            },
          },
        },
      },
      // 3. user_list 점수 순으로 정렬
      {
        $addFields: {
          user_list: {
            $sortArray: { input: "$user_list", sortBy: { score: -1 } },
          },
        },
      },

      // 4. endTime 최신순으로 그룹 문서 정렬
      { $sort: { endTime: -1 } },
    ]);
    res.json(notifyResult);
  } catch {
    res.status(500);
  }
});

module.exports = router;

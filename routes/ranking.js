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

    res.json({
      dayRank,
      weekRank,
      meanRank,
    });
  } catch (err) {
    console.error(err);
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

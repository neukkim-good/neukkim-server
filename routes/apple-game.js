const express = require("express");
const router = express.Router();
const Record = require("../models/Record");
const { verifyToken } = require("../utils/auth");

router.post("/", async function (req, res, next) {
  try {
    const token = req.headers["bearer-token"]?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "토큰이 없습니다." });

    const decoded = verifyToken(token);
    if (!decoded)
      return res.status(401).json({ message: "토큰이 유효하지 않습니다." });

    const { score } = req.body;

    const newRecord = new Record({
      user_id: decoded._id,
      score,
      time: new Date(),
    });

    await newRecord.save();
    res.json({ message: "게임 결과 저장 완료" });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

module.exports = router;

var express = require("express");
var router = express.Router();
var User = require("../models/User");
const Record = require("../models/Record");

//mypage에서 내 기록 가져오기
router.get("/:userId", async function (req, res) {
  try {
    const { userId } = req.params;

    const records = await Record.find({ userId: userId }).sort({ time: -1 });
    res.status(200).json(records);
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

module.exports = router;

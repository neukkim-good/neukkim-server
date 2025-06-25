const express = require("express");
const Record = require("../models/Record");
const router = express.Router();

router.get("/", async function (req, res, next) {
  console.log(Record);
  const record = await Record.find();

  res.json(record);
});

module.exports = router;

// branch 테스트 용

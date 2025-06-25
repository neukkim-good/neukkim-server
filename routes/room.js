var express = require("express");
const Room = require("../models/Room");
var router = express.Router();

router.get("/", async function (req, res, next) {
  console.log("접속 시도");
  const list = await Room.find();
  res.json(list);
});

module.exports = router;

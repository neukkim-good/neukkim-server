const mongoose = require("mongoose");
//const { isEmail } = require("validator");
//const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "이메일을 입력하여 주세요."],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "비밀번호가 입력되어야 합니다."],
  },
  nickname: {
    type: String,
    required: [true, "닉네임을 입력하여 주세요."],
    unique: true,
    minlength: [2, "닉네임은 최소 2자 이상이어야 합니다."],
    maxlength: [20, "닉네임은 최대 20자까지 가능합니다."],
  },
  token: {
    type: String,
    required: [true, "토큰이 있어야 합니다."],
  },
});
const User = mongoose.model("user", userSchema);

module.exports = User;

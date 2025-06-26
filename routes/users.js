var express = require("express");
const User = require("../models/User");
const { createToken, verifyToken } = require("../utils/auth");
var router = express.Router();

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

router.post("/signup", async (req, res, next) => {
  try {
    const { email, password, nickname } = req.body;
    console.log(req.body);
    const user = await User.signUp(email, password, nickname);
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(400);
    next(err);
  }
});

// router.post("/login", async (req, res, next) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.login(email, password);
//     const tokenMaxAge = 60 * 60 * 24 * 3;
//     const token = createToken(user, tokenMaxAge);

//     user.token = token;

//     res.cookie("authToken", token, {
//       httpOnly: true,
//       maxAge: tokenMaxAge * 1000,
//     });

//     console.log(user);
//     res.status(201).json(user);
//   } catch (err) {
//     console.error(err);
//     res.status(400);
//     next(err);
//   }
// });

// login 라우터
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.login(email, password); // DB에서 user 정보를 가져옴
    const tokenMaxAge = 60 * 60 * 24 * 3;

    // --- [핵심 수정 부분] ---
    // 토큰에 담을 순수 데이터 객체(payload)를 만듭니다.
    const payload = {
      _id: user._id,
      email: user.email,
      // 필요하다면 다른 정보(예: 닉네임, 역할)도 추가할 수 있습니다.
      // nickname: user.nickname,
      // role: user.role
    };
    // --- 여기까지 ---

    // 이제 모델 객체(user) 대신, 깔끔하게 정제된 payload 객체로 토큰을 생성합니다.
    const token = createToken(payload, tokenMaxAge);

    // user.token = token; // 이 줄은 클라이언트에 user 객체를 보낼 때 토큰을 포함시키기 위한 것이므로 그대로 두거나, 아래 res.json에서 처리해도 됩니다.

    res.cookie("authToken", token, {
      httpOnly: true,
      maxAge: tokenMaxAge * 1000,
    });

    // 최종 응답에는 토큰 정보가 포함된 user 객체를 보내는 것이 일반적입니다.
    // user.toObject()를 사용하여 순수 객체로 변환 후 토큰을 추가하는 것이 더 안전합니다.
    const userResponse = user.toObject();
    userResponse.token = token;

    console.log("로그인 성공:", userResponse); // 로그인된 유저 정보 확인
    res.status(201).json(userResponse);
  } catch (err) {
    console.error(err);
    res.status(400);
    next(err);
  }
});

router.all("/logout", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.login(email, password);
    const tokenMaxAge = 60 * 60 * 24 * 3;
    const token = createToken(user, tokenMaxAge);

    user.token = token;

    res.cookie("authToken", token, {
      httpOnly: true,
      expires: new Date(Date.now()),
    });
    res.cookie("");

    console.log(user);
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(400);
    next(err);
  }
});

async function authenticate(req, res, next) {
  let token = req.cookies.authToken;
  let headerToken = req.headers.authorization;
  if (!token && headerToken) {
    token = headerToken.split(" ")[1];
  }

  const user = verifyToken(token);
  req.user = user;

  if (!user) {
    const error = new Error("Authorization Failed");
    error.status = 403;

    next(error);
  }
  next();
}

module.exports = router;

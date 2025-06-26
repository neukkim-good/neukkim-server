const { verifyToken } = require("../utils/auth");

function authenticate(req, res, next) {
  // ✅ try...catch로 감싸서 모든 종류의 에러를 처리합니다.
  try {
    let token = req.cookies.authToken;
    const headerToken = req.headers.authorization;

    if (!token && headerToken) {
      token = headerToken.split(" ")[1];
    }

    const userPayload = verifyToken(token);

    if (!userPayload) {
      throw new Error("유효하지 않거나 존재하지 않는 토큰입니다.");
    }

    req.user = userPayload;
    next();
  } catch (error) {
    // 여기서 모든 토큰 관련 에러(malformed, expired 등)가 잡힙니다.
    const authError = new Error("Authorization Failed: 인증에 실패했습니다.");
    authError.status = 403; // 또는 401

    // 에러를 다음 핸들러로 전달하여 서버가 다운되지 않도록 합니다.
    next(authError);
  }
}

module.exports = { authenticate };

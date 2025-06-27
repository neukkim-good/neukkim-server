var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var roomRouter = require("./routes/room");
var rankingRouter = require("./routes/ranking");
var myPageRouter = require("./routes/mypage");
var appleGameRouter = require("./routes/apple-game");

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
pw = process.env.PW;
const DB_URL = `mongodb+srv://feelGood:${pw}@express-mongodb.antwmvy.mongodb.net/neukkim-good`;
mongoose
  .connect(DB_URL, {
    retryWrites: true,
    w: "majority",
    appName: "express-mongodb",
  })
  .then(() => {
    console.log("Connected Successful");
  })
  .catch((err) => {
    console.log(err);
  });

var app = express();

app.use(
  cors({
    origin: ["http://13.125.2.253:3000", "http://localhost:3000"], // 클라이언트 주소
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/room", roomRouter);
app.use("/ranking", rankingRouter);
app.use("/mypage", myPageRouter);
app.use("/apple-game", appleGameRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

var http = require("http");
var server = http.Server(app);

var socket = require("socket.io");
var io = socket(server);

var port = 3002;

io.on("connection", function (socket) {
  console.log("User Join");
  socket.on("message", (data) => {
    console.log("Message received: ", data);
    socket.broadcast.emit("receive_message", data);
  });
});

server.listen(port, function () {
  console.log("Server is running on port " + port);
});

module.exports = app;

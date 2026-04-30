require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const tasksRouter = require("./routes/tasks");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, course: "CPS3500", project: "SESMag", student: "Yuan Liu" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/tasks", tasksRouter);

app.use((err, _req, res, _next) => {
  console.error("API_ERROR", { message: err.message, code: err.code });
  if (err && err.code && `${err.code}`.startsWith("08")) {
    return res.status(503).json({ message: "Database is waking up. Please retry in a few seconds." });
  }
  return res.status(500).json({ message: "Internal server error. Please retry." });
});

module.exports = app;

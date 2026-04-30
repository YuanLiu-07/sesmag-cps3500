const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { query } = require("../lib/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["employee", "hr", "manager"]).default("employee"),
  phone: z.string().max(40).optional().default(""),
  bio: z.string().max(500).optional().default(""),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function buildToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
}

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await query("SELECT id FROM users WHERE email = $1", [data.email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, bio)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, role, phone, bio, created_at`,
      [data.fullName, data.email, hashedPassword, data.role, data.phone, data.bio],
    );
    return res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", errors: error.issues });
    }
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await query("SELECT * FROM users WHERE email = $1", [data.email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = buildToken(user);
    setAuthCookie(res, token);
    return res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        bio: user.bio,
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", errors: error.issues });
    }
    return next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT id, full_name, email, role, phone, bio, created_at FROM users WHERE id = $1",
      [req.user.id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

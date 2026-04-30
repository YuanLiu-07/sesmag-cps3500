const express = require("express");
const { z } = require("zod");
const { query } = require("../lib/db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const updateSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().max(40).optional(),
  bio: z.string().max(500).optional(),
});

router.get("/", requireAuth, requireRole(["hr", "manager"]), async (_req, res, next) => {
  try {
    const result = await query(
      "SELECT id, full_name, email, role, phone, bio, created_at FROM users ORDER BY id ASC",
    );
    return res.json({ users: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const parsedId = Number(req.params.id);
    if (!Number.isInteger(parsedId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const data = updateSchema.parse(req.body);
    const canEditSelf = req.user.id === parsedId;
    const canEditAll = ["hr", "manager"].includes(req.user.role);
    if (!canEditSelf && !canEditAll) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const current = await query("SELECT * FROM users WHERE id = $1", [parsedId]);
    if (current.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const merged = {
      full_name: data.fullName ?? current.rows[0].full_name,
      phone: data.phone ?? current.rows[0].phone,
      bio: data.bio ?? current.rows[0].bio,
    };

    const result = await query(
      `UPDATE users SET full_name = $1, phone = $2, bio = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, full_name, email, role, phone, bio, updated_at`,
      [merged.full_name, merged.phone, merged.bio, parsedId],
    );
    return res.json({ user: result.rows[0] });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", errors: error.issues });
    }
    return next(error);
  }
});

module.exports = router;

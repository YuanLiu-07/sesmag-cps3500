const express = require("express");
const { z } = require("zod");
const { query } = require("../lib/db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const createTaskSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(2000).optional().default(""),
  assignedTo: z.number().int().positive(),
  dueDate: z.string().optional(),
});

const updateTaskSchema = z.object({
  status: z.enum(["todo", "in_progress", "blocked", "done"]).optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  note: z.string().min(2).max(2000),
});

router.get("/my", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.id, t.title, t.description, t.status, t.progress_percent, t.due_date,
              t.assigned_to, t.assigned_by, u.full_name AS assigned_to_name
       FROM tasks t
       JOIN users u ON u.id = t.assigned_to
       WHERE t.assigned_to = $1
       ORDER BY t.created_at DESC`,
      [req.user.id],
    );
    return res.json({ tasks: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.get("/all", requireAuth, requireRole(["manager"]), async (_req, res, next) => {
  try {
    const taskResult = await query(
      `SELECT t.id, t.title, t.description, t.status, t.progress_percent, t.due_date,
              t.assigned_to, t.assigned_by, assignee.full_name AS assigned_to_name,
              manager.full_name AS assigned_by_name
       FROM tasks t
       JOIN users assignee ON assignee.id = t.assigned_to
       JOIN users manager ON manager.id = t.assigned_by
       ORDER BY t.created_at DESC`,
    );
    const notesResult = await query(
      `SELECT n.id, n.task_id, n.user_id, u.full_name, n.note, n.progress_percent, n.created_at
       FROM progress_notes n
       JOIN users u ON u.id = n.user_id
       ORDER BY n.created_at DESC`,
    );
    return res.json({ tasks: taskResult.rows, notes: notesResult.rows });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requireRole(["manager"]), async (req, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const assignee = await query("SELECT id FROM users WHERE id = $1", [data.assignedTo]);
    if (assignee.rowCount === 0) {
      return res.status(404).json({ message: "Assigned user not found" });
    }
    const result = await query(
      `INSERT INTO tasks (title, description, assigned_to, assigned_by, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, assigned_to, assigned_by, status, progress_percent, due_date`,
      [data.title, data.description, data.assignedTo, req.user.id, data.dueDate || null],
    );
    return res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", errors: error.issues });
    }
    return next(error);
  }
});

router.post("/:id/progress", requireAuth, async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) {
      return res.status(400).json({ message: "Invalid task id" });
    }
    const data = updateTaskSchema.parse(req.body);
    const taskResult = await query("SELECT * FROM tasks WHERE id = $1", [taskId]);
    if (taskResult.rowCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = taskResult.rows[0];
    const canUpdate = req.user.role === "manager" || task.assigned_to === req.user.id;
    if (!canUpdate) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const nextStatus = data.status ?? task.status;
    const nextProgress = data.progressPercent ?? task.progress_percent;
    await query(
      `UPDATE tasks
       SET status = $1, progress_percent = $2, updated_at = NOW()
       WHERE id = $3`,
      [nextStatus, nextProgress, taskId],
    );

    await query(
      `INSERT INTO progress_notes (task_id, user_id, note, progress_percent)
       VALUES ($1, $2, $3, $4)`,
      [taskId, req.user.id, data.note, nextProgress],
    );

    return res.json({ message: "Progress updated" });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", errors: error.issues });
    }
    return next(error);
  }
});

module.exports = router;

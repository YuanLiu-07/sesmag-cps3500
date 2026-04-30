const express = require("express");
const { z } = require("zod");
const { query } = require("../lib/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
});

function estimateCompletion(tasks) {
  if (!tasks.length) {
    return {
      averageProgress: 0,
      estimatedDaysRemaining: 0,
      estimatedCompletionDate: "No tasks yet",
      summary: "No active tasks found. Assign tasks first to estimate a completion date.",
    };
  }

  const now = new Date();
  const averageProgress =
    tasks.reduce((sum, task) => sum + Number(task.progress_percent || 0), 0) / tasks.length;

  let totalDaysRemaining = 0;
  for (const task of tasks) {
    const progress = Number(task.progress_percent || 0);
    const createdAt = new Date(task.created_at);
    const daysElapsed = Math.max(
      1,
      Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const velocity = Math.max(3, progress / daysElapsed); // minimum fallback velocity
    const daysRemaining = (100 - progress) / velocity;
    totalDaysRemaining += Math.max(0, daysRemaining);
  }

  const estimatedDaysRemaining = Math.ceil(totalDaysRemaining / tasks.length);
  const etaDate = new Date(now);
  etaDate.setDate(etaDate.getDate() + estimatedDaysRemaining);

  return {
    averageProgress: Number(averageProgress.toFixed(1)),
    estimatedDaysRemaining,
    estimatedCompletionDate: etaDate.toISOString().slice(0, 10),
    summary: `Team average progress is ${averageProgress.toFixed(
      1,
    )}%. Estimated completion in about ${estimatedDaysRemaining} day(s), around ${
      etaDate.toISOString().slice(0, 10)
    }.`,
  };
}

function localAssistantReply(message, context) {
  const lower = message.toLowerCase();
  const memberNames = [...new Set(context.tasks.map((task) => task.assigned_to_name.toLowerCase()))];
  const matchedMember = memberNames.find((name) => lower.includes(name.split(" ")[0]));
  if (matchedMember) {
    const normalized = matchedMember.toLowerCase();
    const memberTasks = context.tasks.filter(
      (task) => task.assigned_to_name.toLowerCase() === normalized,
    );
    const memberNotes = context.recentNotes.filter((note) =>
      note.full_name.toLowerCase().includes(normalized.split(" ")[0]),
    );
    if (memberTasks.length === 0) {
      return `${matchedMember} currently has no assigned tasks in the system.`;
    }
    const lines = memberTasks.map(
      (task) => `- ${task.title}: ${task.status}, ${task.progress_percent}%`,
    );
    const noteLine =
      memberNotes[0] &&
      `Latest note: ${memberNotes[0].note} (${memberNotes[0].progress_percent ?? "n/a"}%).`;
    return `${matchedMember}'s current work:\n${lines.join("\n")}${
      noteLine ? `\n${noteLine}` : ""
    }`;
  }

  const tips = [
    "Start with project goal and user roles (manager vs member).",
    "Demo task assignment first, then member progress updates with notes.",
    "Show live team progress and explain estimated completion date logic.",
    "Highlight security basics: hashed passwords, role-based access control, and validated inputs.",
  ];

  if (lower.includes("manager") && lower.includes("task")) {
    return `In this Project Manager system, manager tasks mean planning and coordination work: creating tasks, assigning them to team members, tracking progress, and reviewing notes to remove blockers. A manager task focuses on project delivery, not just personal coding.\n\nCurrent team snapshot: ${context.estimate.summary}`;
  }

  if (lower.includes("estimate") || lower.includes("eta") || lower.includes("completion")) {
    return `Estimated completion uses current task progress from all members. ${context.estimate.summary}`;
  }

  if (lower.includes("presentation") || lower.includes("demo") || lower.includes("tips")) {
    return `Presentation tips:\n- ${tips.join("\n- ")}`;
  }

  if (lower.includes("computer science") || lower.includes("cs")) {
    return `Computer science perspective:\n- System design: role-based workflow for manager/member operations.\n- Backend engineering: REST APIs, PostgreSQL schema, validation, retry handling.\n- Security: JWT session cookie, bcrypt hashing, and protected routes.\n- Team analytics: progress aggregation and ETA estimation from live task data.\n\nCurrent team snapshot: ${context.estimate.summary}`;
  }

  return `I am your Project Manager AI assistant for this course final project. I can explain manager tasks, summarize team progress, estimate completion time, and provide presentation tips.\n\nCurrent team snapshot: ${context.estimate.summary}`;
}

async function openAiReply(message, context) {
  const systemPrompt = `You are Project Manager AI Copilot for a CPS3500 final project management system.
Purpose:
- Help users understand manager tasks and software engineering workflow.
- Focus on computer science context.
- Use current live team progress to estimate completion date.
- Give practical presentation tips when asked.

Context:
${JSON.stringify(context, null, 2)}

If user asks what manager tasks mean, clearly explain:
- assigning tasks,
- tracking progress,
- reviewing notes,
- removing blockers,
- coordinating delivery timeline.

When user asks about a specific member (example: "what did Alex do?"), answer using context.recentNotes and context.tasks with concrete task names and progress percentages.
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "No response generated.";
}

router.post("/chat", requireAuth, async (req, res, next) => {
  try {
    const { message } = chatSchema.parse(req.body);
    const tasksResult = await query(
      `SELECT t.id, t.title, t.status, t.progress_percent, t.created_at, u.full_name AS assigned_to_name
       FROM tasks t
       JOIN users u ON u.id = t.assigned_to
       ORDER BY t.created_at DESC`,
    );
    const notesResult = await query(
      `SELECT n.id, n.task_id, n.note, n.progress_percent, n.created_at, u.full_name
       FROM progress_notes n
       JOIN users u ON u.id = n.user_id
       ORDER BY n.created_at DESC
       LIMIT 20`,
    );

    const estimate = estimateCompletion(tasksResult.rows);
    const context = {
      requester: { id: req.user.id, role: req.user.role, name: req.user.fullName },
      estimate,
      tasks: tasksResult.rows,
      recentNotes: notesResult.rows,
    };

    let reply;
    let engine = "fallback";
    if (process.env.OPENAI_API_KEY) {
      try {
        reply = await openAiReply(message, context);
        engine = "openai";
      } catch {
        reply = localAssistantReply(message, context);
      }
    } else {
      reply = localAssistantReply(message, context);
    }

    return res.json({
      reply,
      estimate,
      engine,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", errors: error.issues });
    }
    return next(error);
  }
});

module.exports = router;

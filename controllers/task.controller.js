import Groq from "groq-sdk";
import Task from "../models/Task.js";

const allowedStatus = new Set(["todo", "in-progress", "done"]);
const allowedPriority = new Set(["low", "medium", "high"]);

const getGroq = () => {
  if (!process.env.GROQ_API_KEY) {
    const error = new Error("AI task planning is not configured. Add GROQ_API_KEY to the server environment.");
    error.status = 503;
    throw error;
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listTasks = async (req, res, next) => {
  try {
    const { status, priority, search, due } = req.query;
    const filter = { user: req.user.userId };
    if (status && status !== "all" && allowedStatus.has(status)) filter.status = status;
    if (priority && priority !== "all" && allowedPriority.has(priority)) filter.priority = priority;
    if (search?.trim()) {
      const safeSearch = escapeRegex(search.trim().slice(0, 100));
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (due === "upcoming") {
      filter.dueDate = { $gte: new Date() };
      filter.status = { $ne: "done" };
    } else if (due === "overdue") {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: "done" };
    }
    const tasks = await Task.find(filter).sort({ status: 1, dueDate: 1, createdAt: -1 }).limit(500).lean();
    return res.json({ success: true, count: tasks.length, tasks });
  } catch (error) { next(error); }
};

const createTask = async (req, res, next) => {
  try {
    const { title, description = "", status = "todo", priority = "medium", dueDate = null } = req.body;
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, message: "Task title is required" });
    }
    if (!allowedStatus.has(status) || !allowedPriority.has(priority)) {
      return res.status(400).json({ success: false, message: "Invalid task status or priority" });
    }
    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    if (dueDate && Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid due date" });
    }
    const task = await Task.create({
      title: title.trim().slice(0, 180), description: String(description).slice(0, 4000),
      status, priority, dueDate: parsedDueDate,
      completedAt: status === "done" ? new Date() : null,
      user: req.user.userId,
    });
    return res.status(201).json({ success: true, task });
  } catch (error) { next(error); }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.userId });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const { title, description, status, priority, dueDate } = req.body;
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) return res.status(400).json({ success: false, message: "Task title cannot be empty" });
      task.title = title.trim().slice(0, 180);
    }
    if (description !== undefined) task.description = String(description).slice(0, 4000);
    if (status !== undefined) {
      if (!allowedStatus.has(status)) return res.status(400).json({ success: false, message: "Invalid task status" });
      task.status = status;
      task.completedAt = status === "done" ? (task.completedAt || new Date()) : null;
    }
    if (priority !== undefined) {
      if (!allowedPriority.has(priority)) return res.status(400).json({ success: false, message: "Invalid task priority" });
      task.priority = priority;
    }
    if (dueDate !== undefined) {
      const parsedDueDate = dueDate ? new Date(dueDate) : null;
      if (dueDate && Number.isNaN(parsedDueDate.getTime())) return res.status(400).json({ success: false, message: "Invalid due date" });
      task.dueDate = parsedDueDate;
    }
    await task.save();
    return res.json({ success: true, task });
  } catch (error) { next(error); }
};

const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    return res.json({ success: true, message: "Task deleted" });
  } catch (error) { next(error); }
};

const generateTaskPlan = async (req, res, next) => {
  try {
    const { goal, availableTime = "", existingTasks = [] } = req.body;
    if (typeof goal !== "string" || !goal.trim()) {
      return res.status(400).json({ success: false, message: "Tell the AI what you want to accomplish" });
    }
    const client = getGroq();
    const model = process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-120b";
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_completion_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a practical productivity planner. Return valid JSON only, shaped as {\"tasks\":[{\"title\":string,\"description\":string,\"priority\":\"low\"|\"medium\"|\"high\",\"daysFromNow\":number}]}. Produce 3-8 actionable, realistic tasks. daysFromNow must be an integer from 0 to 30. Do not include markdown or extra keys." },
        { role: "user", content: `Goal: ${goal.trim().slice(0, 2000)}\nAvailable time: ${String(availableTime).slice(0, 200)}\nExisting tasks to avoid duplicating: ${JSON.stringify(Array.isArray(existingTasks) ? existingTasks.slice(0, 30).map((task) => String(task.title || "").slice(0, 120)) : [])}` },
      ],
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error("AI returned an invalid plan. Please try again."); }
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 8).map((task) => ({
      title: String(task.title || "Untitled task").trim().slice(0, 180),
      description: String(task.description || "").slice(0, 1000),
      priority: allowedPriority.has(task.priority) ? task.priority : "medium",
      daysFromNow: Math.min(30, Math.max(0, Number.isFinite(Number(task.daysFromNow)) ? Math.round(Number(task.daysFromNow)) : 1)),
    })) : [];
    if (!tasks.length) throw new Error("AI did not return any usable tasks. Please try again.");
    return res.json({ success: true, tasks, model });
  } catch (error) {
    if (error.status === 503) return res.status(503).json({ success: false, message: error.message });
    if (error.status === 404 || error.code === "model_not_found") return res.status(502).json({ success: false, message: "The configured Groq model is unavailable. Check GROQ_TEXT_MODEL in server/.env." });
    if (error.status === 429) return res.status(429).json({ success: false, message: "AI rate limit reached. Please wait a moment and try again." });
    next(error);
  }
};

export { listTasks, createTask, updateTask, deleteTask, generateTaskPlan };

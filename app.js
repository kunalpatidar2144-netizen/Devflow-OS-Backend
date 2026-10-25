import historyRoutes from "./routes/history.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import taskRoutes from "./routes/task.routes.js";
import userRoutes from "./routes/user.routes.js";
import noteRoutes from "./routes/note.routes.js";
import aiRoutes from "./routes/ai.routes.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import errorHandler from "./middleware/error.middleware.js";

import eventRoutes from "./routes/event.routes.js";

const app = express();

// =========================
// Middleware
// =========================

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    const localDevOrigin = process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "");
    if (!origin || allowedOrigins.includes(origin) || localDevOrigin) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
}));

app.use(helmet());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// =========================
// Routes
// =========================

app.use("/api/users", userRoutes);

app.use("/api/notes", noteRoutes);

app.use("/api/ai", aiRoutes);
app.use("/api/history", historyRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/events", eventRoutes);
app.use("/api/tasks", taskRoutes);

// =========================
// Test Route
// =========================

app.get("/", (_req, res) => {
  res.status(200).json({ success: true, message: "DevFlow OS API is running", version: "1.0.0" });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

// =========================
// Error Middleware
// =========================

app.use(errorHandler);

export default app;
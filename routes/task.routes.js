import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { listTasks, createTask, updateTask, deleteTask, generateTaskPlan } from "../controllers/task.controller.js";

const router = express.Router();
router.use(authMiddleware);
router.get("/", listTasks);
router.post("/", createTask);
router.post("/plan", generateTaskPlan);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);
export default router;

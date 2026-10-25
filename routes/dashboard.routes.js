import express from "express";

const router = express.Router();

import authMiddleware from "../middleware/auth.middleware.js";

import { getDashboard } from "../controllers/dashboard.controller.js";

router.get("/", authMiddleware, getDashboard);

export default router;
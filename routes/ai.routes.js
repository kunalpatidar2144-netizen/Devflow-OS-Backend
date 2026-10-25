import express from "express";

const router = express.Router();

import { aiAssistant } from "../controllers/ai.controller.js";
import { aiBrain } from "../controllers/aiBrain.controller.js";
import {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
} from "../controllers/aiConversation.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

// All AI Brain conversations are private to the authenticated user.
router.get("/chats", authMiddleware, listConversations);
router.post("/chats", authMiddleware, createConversation);
router.get("/chats/:id", authMiddleware, getConversation);
router.delete("/chats/:id", authMiddleware, deleteConversation);

// AI Brain (retrieval-augmented answers from the authenticated user workspace)
router.post("/brain", authMiddleware, aiBrain);

// AI Assistant
router.post("/assistant", authMiddleware, aiAssistant);

export default router;

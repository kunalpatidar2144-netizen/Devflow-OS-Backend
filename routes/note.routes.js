import express from "express";
const router = express.Router();

import {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
  searchNotes,
  toggleFavorite,
  archiveNote,
  unarchiveNote,
  getArchivedNotes,
} from "../controllers/note.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.js";

// Create Note
router.post(
  "/create",
  authMiddleware,
  upload.array("attachments", 10),
  createNote
);

// Get Active Notes
router.get("/", authMiddleware, getNotes);

// Get Archived Notes
router.get("/archived", authMiddleware, getArchivedNotes);

// Search Notes
router.get("/search", authMiddleware, searchNotes);

// Favorite
router.put(
  "/:id/favorite",
  authMiddleware,
  toggleFavorite
);

// Archive
router.put(
  "/:id/archive",
  authMiddleware,
  archiveNote
);

// Unarchive
router.put(
  "/:id/unarchive",
  authMiddleware,
  unarchiveNote
);

// Update Note
router.put(
  "/:id",
  authMiddleware,
  upload.array("attachments", 10),
  updateNote
);

// Delete Note
router.delete("/:id", authMiddleware, deleteNote);

export default router;
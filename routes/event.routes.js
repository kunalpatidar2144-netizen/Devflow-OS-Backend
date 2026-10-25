import express from "express";

const router = express.Router();

import {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
  getEventReminders,
} from "../controllers/event.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

// Create Event
router.post(
  "/create",
  authMiddleware,
  createEvent
);

// Get Event Reminders
router.get(
  "/reminders",
  authMiddleware,
  getEventReminders
);

// Get All User Events
router.get(
  "/",
  authMiddleware,
  getEvents
);

// Update Event
router.put(
  "/:id",
  authMiddleware,
  updateEvent
);

// Delete Event
router.delete(
  "/:id",
  authMiddleware,
  deleteEvent
);

export default router;
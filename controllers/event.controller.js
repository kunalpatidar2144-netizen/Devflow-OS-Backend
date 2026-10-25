import Event from "../models/Event.js";

// =========================
// Create Event
// =========================
const createEvent = async (req, res) => {
  try {
    const { title, date, time, description } = req.body;
    const userId = req.user.userId;

    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: "Title and Date are required",
      });
    }

    const eventDate = new Date(date);

    if (Number.isNaN(eventDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid event date",
      });
    }

    const event = await Event.create({
      title: title.trim(),
      date: eventDate,
      time: time || "",
      description: description || "",
      user: userId,
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.log("CREATE EVENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Get User Events
// =========================
const getEvents = async (req, res) => {
  try {
    const userId = req.user.userId;

    const events = await Event.find({
      user: userId,
    }).sort({
      date: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.log("GET EVENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Update Event
// =========================
const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;

    const {
      title,
      date,
      time,
      description,
    } = req.body;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (title !== undefined) {
      event.title = title.trim();
    }

    if (date !== undefined) {
      const eventDate = new Date(date);

      if (Number.isNaN(eventDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid event date",
        });
      }

      event.date = eventDate;
    }

    if (time !== undefined) {
      event.time = time;
    }

    if (description !== undefined) {
      event.description = description;
    }

    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    console.log("UPDATE EVENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Delete Event
// =========================
const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await event.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.log("DELETE EVENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Get Event Reminders
// =========================
const getEventReminders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();

    // Calendar events are stored as date-only values (UTC midnight).
    // Build today's calendar date in India so today's events are not
    // accidentally excluded after midnight has passed.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const todayKey = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    const startDate = new Date(`${todayKey}T00:00:00.000Z`);
    const endDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);

    const reminders = await Event.find({
      user: userId,
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: 1, time: 1 });

    return res.status(200).json({
      success: true,
      count: reminders.length,
      reminders,
    });
  } catch (error) {
    console.log("GET EVENT REMINDERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
  getEventReminders,
};
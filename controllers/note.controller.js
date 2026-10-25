import Note from "../models/Note.js";
import HistoryItem from "../models/HistoryItem.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// Escape special characters in search text
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Save note activity in History
const recordNoteActivity = async ({
  userId,
  action,
  note,
  details = "",
}) => {
  try {
    const noteTitle = String(
      note?.title || "Untitled note"
    ).slice(0, 180);

    await HistoryItem.create({
      user: userId,
      type: "note_activity",
      title: `${action}: ${noteTitle}`.slice(0, 180),
      content:
        details || `${action} for note "${noteTitle}".`,
      metadata: {
        action,
        noteId: String(note?._id || ""),
        noteTitle,
      },
      pinned: false,
    });
  } catch (historyError) {
    // History error should not stop the note operation
    console.error(
      "Could not save note activity to History:",
      historyError
    );
  }
};

// Upload attachment to Cloudinary
const uploadAttachment = (file) =>
  new Promise((resolve, reject) => {
    const resourceType = file.mimetype.startsWith("image/")
      ? "image"
      : file.mimetype.startsWith("video/")
        ? "video"
        : "raw";

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "devflow-notes",
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve({
          name: file.originalname,
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format || "",
          mimeType: file.mimetype,
          size: file.size,
        });
      }
    );

    streamifier
      .createReadStream(file.buffer)
      .pipe(stream);
  });

// =========================
// Create Note
// =========================
const createNote = async (req, res) => {
  try {
    const { title, content = "" } = req.body;
    const userId = req.user.userId;
    const files = req.files || [];

    if (
      String(title || "").length > 180 ||
      String(content || "").length > 100000
    ) {
      return res.status(400).json({
        success: false,
        message: "Note title or content is too long",
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      (!String(content).trim() && files.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title and either note content or an attachment are required",
      });
    }

    const attachments = files.length
      ? await Promise.all(files.map(uploadAttachment))
      : [];

    const note = await Note.create({
      title: title.trim(),
      content: String(content || ""),
      attachments,
      user: userId,
      isFavorite: false,
      isArchived: false,
    });

    await recordNoteActivity({
      userId,
      action: "Note created",
      note,
    });

    return res.status(201).json({
      success: true,
      message: "Note created successfully",
      note,
    });
  } catch (error) {
    console.error("Create note error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Get Normal Notes
// =========================
const getNotes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const notes = await Note.find({
      user: userId,
      $or: [
        { isArchived: false },
        { isArchived: { $exists: false } },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    console.error("Get notes error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Update Note
// =========================
const updateNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const { title, content } = req.body;
    const files = req.files || [];
    const userId = req.user.userId;

    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    if (note.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (title !== undefined && String(title).trim()) {
      note.title = title.trim();
    }

    if (content !== undefined) {
      note.content = content;
    }

    if (
      (note.attachments || []).length + files.length > 10
    ) {
      return res.status(400).json({
        success: false,
        message: "A note can have at most 10 attachments",
      });
    }

    if (
      title !== undefined &&
      String(title).length > 180
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Note title must be 180 characters or fewer",
      });
    }

    if (
      content !== undefined &&
      String(content).length > 100000
    ) {
      return res.status(400).json({
        success: false,
        message: "Note content is too long",
      });
    }

    // Add new attachments while keeping existing ones
    if (files.length) {
      const attachments = await Promise.all(
        files.map(uploadAttachment)
      );

      note.attachments = [
        ...(note.attachments || []),
        ...attachments,
      ];
    }

    if (
      !String(note.content || "").trim() &&
      !(note.attachments || []).length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A note must contain text or at least one attachment",
      });
    }

    await note.save();

    await recordNoteActivity({
      userId,
      action: "Note updated",
      note,
    });

    return res.status(200).json({
      success: true,
      message: "Note updated successfully",
      note,
    });
  } catch (error) {
    console.error("Update note error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Delete Note
// =========================
const deleteNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.userId;

    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    if (note.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Record activity before deleting the note
    await recordNoteActivity({
      userId,
      action: "Note deleted",
      note,
    });

    await note.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Delete note error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Search Notes
// =========================
const searchNotes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const search = String(
      req.query.search || ""
    ).trim().slice(0, 100);

    const filter = {
      user: userId,
      $and: [
        {
          $or: [
            { isArchived: false },
            { isArchived: { $exists: false } },
          ],
        },
      ],
    };

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$and.push({
        $or: [
          {
            title: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            content: {
              $regex: safeSearch,
              $options: "i",
            },
          },
        ],
      });
    }

    const notes = await Note.find(filter)
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    console.error("Search notes error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Toggle Favorite
// =========================
const toggleFavorite = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.userId;

    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    if (note.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    note.isFavorite = !note.isFavorite;

    await note.save();

    await recordNoteActivity({
      userId,
      action: note.isFavorite
        ? "Note added to favorites"
        : "Note removed from favorites",
      note,
    });

    return res.status(200).json({
      success: true,
      message: note.isFavorite
        ? "Note added to favorites"
        : "Note removed from favorites",
      note,
    });
  } catch (error) {
    console.error("Toggle favorite error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Archive Note
// =========================
const archiveNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.userId;

    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    if (note.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    note.isArchived = true;

    await note.save();

    await recordNoteActivity({
      userId,
      action: "Note archived",
      note,
    });

    return res.status(200).json({
      success: true,
      message: "Note archived successfully",
      note,
    });
  } catch (error) {
    console.error("Archive note error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Unarchive Note
// =========================
const unarchiveNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.userId;

    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    if (note.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    note.isArchived = false;

    await note.save();

    await recordNoteActivity({
      userId,
      action: "Note unarchived",
      note,
    });

    return res.status(200).json({
      success: true,
      message: "Note unarchived successfully",
      note,
    });
  } catch (error) {
    console.error("Unarchive note error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Get Archived Notes
// =========================
const getArchivedNotes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const notes = await Note.find({
      user: userId,
      isArchived: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    console.error("Get archived notes error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// =========================
// Export Controllers
// =========================
export {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
  searchNotes,
  toggleFavorite,
  archiveNote,
  unarchiveNote,
  getArchivedNotes,
};
import HistoryItem from "../models/HistoryItem.js";

const allowedTypes = [
  "assistant",
  "summary",
  "quiz",
  "note_activity",
];

// GET /history
const listHistory = async (req, res, next) => {
  try {
    const { type, excludeType, pinned, search, from, to } = req.query;

    const filter = {
      user: req.user.userId,
    };

    if (type && type !== "all") {
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid history type",
        });
      }

      filter.type = type;
    }

    if (excludeType) {
      if (!allowedTypes.includes(excludeType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid excluded history type",
        });
      }

      if (filter.type === excludeType) {
        return res.status(200).json({
          success: true,
          items: [],
        });
      }

      filter.type = filter.type
        ? filter.type
        : { $ne: excludeType };
    }

    if (pinned === "true") {
      filter.pinned = true;
    }

    if (search?.trim()) {
      const escaped = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { content: { $regex: escaped, $options: "i" } },
        {
          "messages.content": {
            $regex: escaped,
            $options: "i",
          },
        },
        {
          "metadata.noteTitle": {
            $regex: escaped,
            $options: "i",
          },
        },
      ];
    }

    if (from || to) {
      filter.createdAt = {};

      if (from) {
        filter.createdAt.$gte = new Date(from);
      }

      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const items = await HistoryItem.find(filter)
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(300)
      .lean();

    return res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    next(error);
  }
};

// POST /history
const createHistory = async (req, res, next) => {
  try {
    const {
      type,
      title,
      content = "",
      messages = [],
      metadata = {},
      pinned = false,
    } = req.body;

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Valid history type is required",
      });
    }

    const item = await HistoryItem.create({
      user: req.user.userId,
      type,
      title: String(title || "Untitled").slice(0, 180),
      content: String(content || ""),
      messages: Array.isArray(messages)
        ? messages.slice(-200)
        : [],
      metadata:
        metadata && typeof metadata === "object"
          ? metadata
          : {},
      pinned: Boolean(pinned),
    });

    return res.status(201).json({
      success: true,
      item,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /history/:id
const updateHistory = async (req, res, next) => {
  try {
    const {
      title,
      content,
      messages,
      metadata,
      pinned,
    } = req.body;

    const updates = {};

    if (title !== undefined) {
      updates.title = String(title || "Untitled").slice(0, 180);
    }

    if (content !== undefined) {
      updates.content = String(content || "");
    }

    if (messages !== undefined) {
      updates.messages = Array.isArray(messages)
        ? messages.slice(-200)
        : [];
    }

    if (
      metadata !== undefined &&
      metadata &&
      typeof metadata === "object"
    ) {
      updates.metadata = metadata;
    }

    if (pinned !== undefined) {
      updates.pinned = Boolean(pinned);
    }

    const item = await HistoryItem.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.userId,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "History item not found",
      });
    }

    return res.status(200).json({
      success: true,
      item,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /history/:id
const deleteHistory = async (req, res, next) => {
  try {
    const item = await HistoryItem.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "History item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "History item deleted",
    });
  } catch (error) {
    next(error);
  }
};

export {
  listHistory,
  createHistory,
  updateHistory,
  deleteHistory,
};
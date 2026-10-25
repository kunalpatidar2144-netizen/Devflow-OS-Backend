
import mongoose from "mongoose";

const historyItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["assistant", "summary", "quiz", "note_activity"],
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      default: "Untitled",
    },

    content: {
      type: String,
      default: "",
    },

    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant"],
          required: true,
        },
        content: {
          type: String,
          default: "",
        },
        imageData: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    pinned: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

historyItemSchema.index({
  user: 1,
  type: 1,
  updatedAt: -1,
});

const HistoryItem = mongoose.model("HistoryItem", historyItemSchema);

export default HistoryItem;

import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      default: "",
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    attachments: {
      type: [
        {
          name: {
            type: String,
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
          publicId: {
            type: String,
            default: "",
          },
          resourceType: {
            type: String,
            default: "raw",
          },
          format: {
            type: String,
            default: "",
          },
          mimeType: {
            type: String,
            default: "application/octet-stream",
          },
          size: {
            type: Number,
            default: 0,
          },
        },
      ],
      default: [],
    },

    // Favorite
    isFavorite: {
      type: Boolean,
      default: false,
    },

    // Archive
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Note = mongoose.model("Note", noteSchema);
export default Note;
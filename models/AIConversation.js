import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  sources: [{
    sourceNumber: Number,
    id: String,
    type: String,
    title: String,
    excerpt: String,
    score: Number,
    updatedAt: Date,
  }],
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const aiConversationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, default: "New chat", trim: true, maxlength: 120 },
  messages: { type: [messageSchema], default: [] },
  lastMessageAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

aiConversationSchema.index({ user: 1, lastMessageAt: -1 });

const AIConversation = mongoose.model("AIConversation", aiConversationSchema);
export default AIConversation;

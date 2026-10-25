import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: "", trim: true, maxlength: 4000 },
    status: { type: String, enum: ["todo", "in-progress", "done"], default: "todo", index: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium", index: true },
    dueDate: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, status: 1, dueDate: 1 });
const Task = mongoose.model("Task", taskSchema);
export default Task;

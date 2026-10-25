import mongoose from "mongoose";
import AIConversation from "../models/AIConversation.js";

const ownerId = (req) => req.user?.userId;

export const listConversations = async (req, res, next) => {
  try {
    // Only show conversations after at least one message has been saved.
    const conversations = await AIConversation.find({ user: ownerId(req), "messages.0": { $exists: true } })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .select("title lastMessageAt createdAt updatedAt messages")
      .lean();
    res.json({
      success: true,
      conversations: conversations.map((chat) => ({
        _id: chat._id,
        title: chat.title || "New chat",
        lastMessageAt: chat.lastMessageAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chat.messages?.length || 0,
        preview: chat.messages?.length ? chat.messages[chat.messages.length - 1].content.slice(0, 120) : "",
      })),
    });
  } catch (error) { next(error); }
};

export const createConversation = async (req, res, next) => {
  try {
    const conversation = await AIConversation.create({
      user: ownerId(req),
      title: "New chat",
      messages: [],
      lastMessageAt: new Date(),
    });
    res.status(201).json({ success: true, conversation: { _id: conversation._id, title: conversation.title, messages: [] } });
  } catch (error) { next(error); }
};

export const getConversation = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid chat ID." });
    const conversation = await AIConversation.findOne({ _id: req.params.id, user: ownerId(req) }).lean();
    if (!conversation) return res.status(404).json({ success: false, message: "Chat not found." });
    res.json({ success: true, conversation: { ...conversation, title: conversation.title || "New chat" } });
  } catch (error) { next(error); }
};

export const deleteConversation = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid chat ID." });
    const deleted = await AIConversation.findOneAndDelete({ _id: req.params.id, user: ownerId(req) });
    if (!deleted) return res.status(404).json({ success: false, message: "Chat not found." });
    res.json({ success: true, message: "Chat deleted." });
  } catch (error) { next(error); }
};

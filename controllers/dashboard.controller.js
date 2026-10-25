import Note from "../models/Note.js";
import mongoose from "mongoose";


const getDashboard = async (req, res) => {
  try {
    // Logged-in User ID
    const userId = req.user.userId;

    // Pagination
    const page = Number(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    // Current Date
    const currentDate = new Date();

    // First Day of Current Month
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );

    // Total notes owned by the current user.
    const totalNotes = await Note.countDocuments({ user: userId });

    // Notes Created This Month
    const notesThisMonth = await Note.countDocuments({
      user: userId,
      createdAt: {
        $gte: firstDayOfMonth,
      },
    });
   

    // Total Pages
    const totalPages = Math.ceil(totalNotes / limit);

    // Recent Notes with Pagination
    const recentNotes = await Note.find({
      user: userId,
    })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      totalNotes,
      notesThisMonth,
      totalPages,
      currentPage: page,
      recentNotes,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export {
  getDashboard,
};

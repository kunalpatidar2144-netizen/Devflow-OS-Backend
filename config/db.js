import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected Database:", mongoose.connection.name);

    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.log("Database Connection Error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
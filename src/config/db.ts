import mongoose from "mongoose";
import { config } from "./config";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", (error as Error).message);
    process.exit(1);
  }
};

import mongoose from "mongoose";

const usageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one usage per user
    },
    uploadsUsed: {
      type: Number,
      default: 0,
    },
    asksUsed: {
      type: Number,
      default: 0,
    },
    resetAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Usage", usageSchema);
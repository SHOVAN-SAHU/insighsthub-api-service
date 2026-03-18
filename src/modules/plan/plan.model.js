import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["FREE", "PRO", "BUSINESS"],
      required: true,
      unique: true,
    },

    razorpayPlanId: {
      type: String,
      required: true,
    },

    price: {
      type: Number, // in paise (important for Razorpay)
      required: true,
    },

    durationDays: {
      type: Number,
      default: 30,
    },

    limits: {
      uploads: { type: Number, required: true },
      asks: { type: Number, required: true },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Plan", planSchema);

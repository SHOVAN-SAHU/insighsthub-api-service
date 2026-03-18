import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },

    // razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    razorpaySubscriptionId: {
      type: String,
      default: null,
    },

    razorpayShortUrl: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["CREATED", "PAID", "CANCELLED", "EXPIRED", "FAILED"],
      default: "CREATED",
    },

    startDate: Date,
    endDate: Date,
  },
  { timestamps: true },
);

export default mongoose.model("Subscription", subscriptionSchema);

import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpaySubscriptionId?: string | null;
  razorpayShortUrl?: string | null;
  status: "CREATED" | "PAID" | "CANCELLED" | "EXPIRED" | "FAILED";
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    planId: { type: Schema.Types.ObjectId, ref: "Plan" },

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

export default mongoose.model<ISubscription>("Subscription", subscriptionSchema);

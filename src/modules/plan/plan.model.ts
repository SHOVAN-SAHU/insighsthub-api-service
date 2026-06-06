import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPlan extends Document {
  _id: Types.ObjectId;
  name: "FREE" | "PRO" | "BUSINESS";
  razorpayPlanId: string;
  price: number;
  durationDays: number;
  limits: {
    uploads: number;
    asks: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
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

export default mongoose.model<IPlan>("Plan", planSchema);

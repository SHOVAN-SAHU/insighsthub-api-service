import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUsage extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  uploadsUsed: number;
  asksUsed: number;
  resetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const usageSchema = new Schema<IUsage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
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
  { timestamps: true },
);

export default mongoose.model<IUsage>("Usage", usageSchema);

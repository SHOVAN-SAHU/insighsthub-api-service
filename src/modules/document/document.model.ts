import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDocument extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  space: Types.ObjectId;
  filename: string;
  fileKey: string;
  fileSize: number;
  status: "processing" | "ready" | "failed";
  quotaCharged: boolean;
  errorMessage?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    space: {
      type: Schema.Types.ObjectId,
      ref: "Space",
      required: true,
    },

    filename: {
      type: String,
      required: true,
    },

    fileKey: {
      type: String, // storage path
      required: true,
    },

    fileSize: {
      type: Number, // bytes
      required: true,
    },

    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
    },

    quotaCharged: {
      type: Boolean,
      default: true,
    },

    errorMessage: {
      type: String,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IDocument>("Document", documentSchema);

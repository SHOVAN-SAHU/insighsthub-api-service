import mongoose, { Schema, Document, Types } from "mongoose";

interface IParticipant {
  user: Types.ObjectId;
  role: "owner" | "member";
}

export interface ISpace extends Document {
  _id: Types.ObjectId;
  name: string;
  type: "personal" | "team";
  owner: Types.ObjectId;
  participants: IParticipant[];
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const spaceSchema = new Schema<ISpace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["personal", "team"],
      required: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    participants: [
      {
        _id: false,
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["owner", "member"],
          default: "member",
        },
      },
    ],

    // optional but useful for UI later
    description: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Enforce unique space name per owner
spaceSchema.index({ owner: 1, name: 1 }, { unique: true });

export default mongoose.model<ISpace>("Space", spaceSchema);

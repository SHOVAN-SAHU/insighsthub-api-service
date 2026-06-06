import { Document, Types } from "mongoose";

// Shape of a User document returned from DB
export interface IUser extends Document {
  _id: Types.ObjectId;
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
  role: "user" | "admin";
  plan: "FREE" | "PRO" | "BUSINESS";
  currentPeriodEnd?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

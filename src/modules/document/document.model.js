import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  space: {
    type: mongoose.Schema.Types.ObjectId,
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

  status: {
    type: String,
    enum: ["processing", "ready", "failed"],
    default: "processing",
  },

  errorMessage: {
    type: String,
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

export default mongoose.model("Document", documentSchema);
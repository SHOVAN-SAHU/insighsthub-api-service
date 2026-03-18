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

  filename: String,
  fileUrl: String, // from storage (elasticlake, r2, etc.)

  status: {
    type: String,
    enum: ["processing", "ready", "failed"],
    default: "processing",
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

export default mongoose.model("Document", documentSchema);
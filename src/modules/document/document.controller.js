import Space from "../space/space.model.js";
import Document from "./document.model.js";
import { findUserById } from "../user/user.service.js";
import { refundQuota } from "./document.util.js";

import {
  uploadToStorage,
  generateSignedUrl,
  deleteFromStorage,
} from "../../config/objectStorage.js";

import { callRagIngestion, callRagDelete } from "../../config/ragApi.js";
import { checkAndConsumeQuota } from "../usage/usage.service.js";
import { validateFileSizeByType } from "./document.util.js";

export const uploadDocument = async (req, res) => {
  try {
    const user = req.user;
    const { spaceId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }

    // Validate file size/type
    validateFileSizeByType(file);

    // Validate space access
    const space = await Space.findOne({
      _id: spaceId,
      isActive: true,
      $or: [{ owner: user._id }, { "participants.user": user._id }],
    });

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Resolve quota owner
    const quotaOwnerUser = await findUserById(space.owner);

    // Check quota
    try {
      await checkAndConsumeQuota(quotaOwnerUser, "UPLOAD");
    } catch (err) {
      if (err.message === "UPLOAD_QUOTA_EXCEEDED") {
        return res.status(403).json({
          message: "Upload quota exceeded",
        });
      }

      if (err.message === "INVALID_PLAN") {
        return res.status(400).json({
          message: "Invalid plan",
        });
      }

      throw err;
    }

    // Upload file
    let fileKey;
    try {
      const result = await uploadToStorage(file, spaceId);
      fileKey = result.fileKey;
    } catch (err) {
      console.error("Storage Upload Failed:", err);
      return res.status(500).json({
        message: "File upload failed",
      });
    }

    // Create document
    const document = await Document.create({
      owner: quotaOwnerUser._id,
      space: space._id,
      filename: file.originalname,
      fileKey,
      fileSize: file.size,
    });

    // Generate signed URL
    const signedUrl = await generateSignedUrl(fileKey);

    // Fire RAG ingestion (non-blocking)
    callRagIngestion({
      document_id: document._id,
      file_url: signedUrl,
      space_id: space._id,
      user_id: quotaOwnerUser._id,
      space_type: space.type,
    }).catch(async (err) => {
      console.error("RAG ingestion failed:", err.message);

      await Document.findByIdAndUpdate(document._id, {
        status: "failed",
        errorMessage: err.message,
      });

      await refundQuota(quotaOwnerUser._id, "UPLOAD", document._id);
    });

    return res.status(201).json({
      message: "Document uploaded successfully",
      document,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const updateDocumentStatus = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status, errorMessage } = req.body;

    console.log(
      `Called from RAG service to update document status, DocId: ${documentId}, Status: ${status}`,
    );

    // Validate status
    const allowed = ["ready", "failed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const document = await Document.findById(documentId);

    if (!document || document.isDeleted) {
      return res.status(404).json({ message: "Document not found" });
    }

    document.status = status;

    if (status === "failed") {
      document.errorMessage = errorMessage || "Processing failed";
    }

    await document.save();

    return res.json({
      message: "Document status updated",
    });
  } catch (err) {
    console.error("Status Update Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const user = req.user;
    const { documentId } = req.params;

    // Find document
    const document = await Document.findById(documentId);

    if (!document || document.isDeleted) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Validate space access
    const space = await Space.findOne({
      _id: document.space,
      isActive: true,
      $or: [{ owner: user._id }, { "participants.user": user._id }],
    });

    if (!space) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Mark deleted FIRST (idempotency)
    document.isDeleted = true;
    await document.save();

    // Call RAG delete (non-blocking)
    const meta = {
      documentId: document._id.toString(),
      ownerId: space.owner.toString(),
      spaceId: space._id ? space._id.toString() : null,
      spaceType: space.type,
    };
    callRagDelete(meta)
      .then((res) => {
        console.log("RAG delete success");
      })
      .catch((err) => {
        console.error("RAG delete failed:", err.response?.data || err.message);
      });

    // Delete from storage (non-blocking)
    deleteFromStorage(document.fileKey).catch((err) => {
      console.error("Storage delete failed:", err.message);
    });

    return res.json({
      message: "Document deleted successfully",
    });
  } catch (err) {
    console.error("Delete Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getSpaceDocuments = async (req, res) => {
  try {
    const user = req.user;
    const { spaceId } = req.params;

    // Validate space access
    const space = await Space.findOne({
      _id: spaceId,
      isActive: true,
      $or: [{ owner: user._id }, { "participants.user": user._id }],
    });

    if (!space) {
      return res.status(404).json({
        message: "Space not found",
      });
    }

    // Fetch documents (only required fields)
    const documents = await Document.find({
      space: spaceId,
      isDeleted: false,
    })
      .select("_id filename fileSize status createdAt") // limit fields
      .sort({ createdAt: -1 }) // latest first
      .lean();

    return res.json({
      documents,
    });
  } catch (err) {
    console.error("Fetch Documents Error:", err);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

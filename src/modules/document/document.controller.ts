import { Request, Response } from "express";
import Space from "../space/space.model";
import Document from "./document.model";
import { findUserById } from "../user/user.service";
import { refundQuota } from "./document.util";

import {
  uploadToStorage,
  generateSignedUrl,
  deleteFromStorage,
} from "../../config/objectStorage";

import { callRagIngestion, callRagDelete } from "../../config/ragApi";
import { checkAndConsumeQuota } from "../usage/usage.service";
import { validateFileSizeByType } from "./document.util";

export const uploadDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { spaceId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "File is required" });
      return;
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
      res.status(404).json({ message: "Space not found" });
      return;
    }

    // Resolve quota owner
    const quotaOwnerUser = await findUserById(space.owner);

    // Check quota
    try {
      await checkAndConsumeQuota(quotaOwnerUser!, "UPLOAD");
    } catch (err) {
      if ((err as Error).message === "UPLOAD_QUOTA_EXCEEDED") {
        res.status(403).json({ message: "Upload quota exceeded" });
        return;
      }

      if ((err as Error).message === "INVALID_PLAN") {
        res.status(400).json({ message: "Invalid plan" });
        return;
      }

      throw err;
    }

    // Upload file
    let fileKey: string;
    try {
      const result = await uploadToStorage(file, String(spaceId));
      fileKey = result.fileKey;
    } catch (err) {
      console.error("Storage Upload Failed:", err);
      res.status(500).json({ message: "File upload failed" });
      return;
    }

    // Create document
    const document = await Document.create({
      owner: quotaOwnerUser!._id,
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
      user_id: quotaOwnerUser!._id,
      space_type: space.type,
    }).catch(async (err: Error) => {
      console.error("RAG ingestion failed:", err.message);

      await Document.findByIdAndUpdate(document._id, {
        status: "failed",
        errorMessage: err.message,
      });

      await refundQuota(quotaOwnerUser!._id, "UPLOAD", document._id);
    });

    res.status(201).json({
      message: "Document uploaded successfully",
      document,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateDocumentStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { documentId } = req.params;
    const { status, errorMessage } = req.body as {
      status: string;
      errorMessage?: string;
    };

    console.log(
      `Called from RAG service to update document status, DocId: ${documentId}, Status: ${status}`,
    );

    // Validate status
    const allowed = ["ready", "failed"];
    if (!allowed.includes(status)) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }

    const document = await Document.findById(documentId);

    if (!document || document.isDeleted) {
      res.status(404).json({ message: "Document not found" });
      return;
    }

    document.status = status as "ready" | "failed";

    if (status === "failed") {
      document.errorMessage = errorMessage || "Processing failed";
    }

    await document.save();

    res.json({ message: "Document status updated" });
  } catch (err) {
    console.error("Status Update Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { documentId } = req.params;

    // Find document
    const document = await Document.findById(documentId);

    if (!document || document.isDeleted) {
      res.status(404).json({ message: "Document not found" });
      return;
    }

    // Validate space access
    const space = await Space.findOne({
      _id: document.space,
      isActive: true,
      $or: [{ owner: user._id }, { "participants.user": user._id }],
    });

    if (!space) {
      res.status(403).json({ message: "Access denied" });
      return;
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
      .then(() => {
        console.log("RAG delete success");
      })
      .catch((err: { response?: { data: unknown }; message: string }) => {
        console.error("RAG delete failed:", err.response?.data || err.message);
      });

    // Delete from storage (non-blocking)
    deleteFromStorage(document.fileKey).catch((err: Error) => {
      console.error("Storage delete failed:", err.message);
    });

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSpaceDocuments = async (
  req: Request,
  res: Response,
): Promise<void> => {
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
      res.status(404).json({ message: "Space not found" });
      return;
    }

    // Fetch documents (only required fields)
    const documents = await Document.find({
      space: spaceId,
      isDeleted: false,
    })
      .select("_id filename fileSize status createdAt") // limit fields
      .sort({ createdAt: -1 }) // latest first
      .lean();

    res.json({ documents });
  } catch (err) {
    console.error("Fetch Documents Error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

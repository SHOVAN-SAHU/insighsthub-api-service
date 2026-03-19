import Space from "../space/space.model.js";
import Document from "./document.model.js";
import { findUserById } from "../user/user.service.js";

import {
  uploadToStorage,
  generateSignedUrl,
} from "../../config/objectStorage.js";

import { callRagIngestion } from "../../config/ragApi.js";
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

    // ✅ 0. Validate file size/type (you were missing this)
    validateFileSizeByType(file);

    // 1. Validate space access
    const space = await Space.findOne({
      _id: spaceId,
      isActive: true,
      $or: [{ owner: user._id }, { "participants.user": user._id }],
    });

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // 2. Resolve quota owner
    const quotaOwnerUser = await findUserById(space.owner);

    // 3. Check quota
    await checkAndConsumeQuota(quotaOwnerUser, "UPLOAD");

    // 4. Upload file
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

    // 5. Create document
    const document = await Document.create({
      owner: quotaOwnerUser._id,
      space: space._id,
      filename: file.originalname,
      fileKey,
    });

    // 6. Generate signed URL
    const signedUrl = await generateSignedUrl(fileKey);

    // 7. Fire RAG ingestion (non-blocking)
    callRagIngestion({
      document_id: document._id,
      file_url: signedUrl,
      spaceId: space._id,
      user_id: quotaOwnerUser._id,
      space_type: space.type,
    }).catch(async (err) => {
      console.error("RAG ingestion failed:", err.message);

      await Document.findByIdAndUpdate(document._id, {
        status: "failed",
        errorMessage: err.message,
      });
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

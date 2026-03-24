import express from "express";
import { requireAuth, verifyInternalApiKey } from "../auth/auth.middleware.js";
import { uploadSingle } from "./document.middleware.js";
import {
  uploadDocument,
  updateDocumentStatus,
  deleteDocument,
  getSpaceDocuments,
} from "./document.controller.js";

const router = express.Router();

router.post("/upload/:spaceId", requireAuth, uploadSingle, uploadDocument);
router.patch("/status/:documentId", verifyInternalApiKey, updateDocumentStatus);
router.delete("/:documentId", requireAuth, deleteDocument);
router.get("/:spaceId", requireAuth, getSpaceDocuments);

export default router;

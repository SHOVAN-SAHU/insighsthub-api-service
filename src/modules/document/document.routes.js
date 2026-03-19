import express from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { uploadSingle } from "./document.middleware.js";
import { uploadDocument } from "./document.controller.js";

const router = express.Router();

router.post("/upload/:spaceId", requireAuth, uploadSingle, uploadDocument);

export default router;

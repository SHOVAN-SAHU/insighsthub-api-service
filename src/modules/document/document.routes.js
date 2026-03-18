import express from "express";
import { uploadDocument } from "./document.controller.js";
import { requireAuth } from "../auth/auth.middleware.js"

const router = express.Router();

router.post("/upload", requireAuth, uploadDocument);

export default router;
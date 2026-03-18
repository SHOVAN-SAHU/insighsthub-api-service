import express from "express";
import { askQuestion } from "./ask.controller.js";
import { requireAuth } from "../auth/auth.middleware.js"

const router = express.Router();

router.post("/", requireAuth, askQuestion);

export default router;
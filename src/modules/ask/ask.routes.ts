import express from "express";
import { askQuestion } from "./ask.controller";
import { requireAuth } from "../auth/auth.middleware";

const router = express.Router();

router.post("/:spaceId", requireAuth, askQuestion);

export default router;

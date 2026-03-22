import express from "express";
import { searchUsers } from "./search.controller.js";
import { requireAuth } from "../auth/auth.middleware.js"

const router = express.Router();

router.get("/", requireAuth, searchUsers);

export default router;
import express from "express";
import { searchUsers } from "./search.controller";
import { requireAuth } from "../auth/auth.middleware";

const router = express.Router();

router.get("/", requireAuth, searchUsers);

export default router;

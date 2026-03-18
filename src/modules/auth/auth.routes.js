import express from "express";
import { googleLogin, logout, getCurrentUser } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

const router = express.Router();

router.post("/login", googleLogin);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);

export default router;

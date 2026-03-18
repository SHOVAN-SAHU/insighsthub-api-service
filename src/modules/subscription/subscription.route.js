import express from "express";
import {
  createSubscription,
  razorpayWebhook,
} from "./subscription.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";

const router = express.Router();

router.post("/create-sub", requireAuth, createSubscription);
router.post("/webhook", razorpayWebhook);

export default router;

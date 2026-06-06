import express from "express";
import {
  createSubscription,
  razorpayWebhook,
} from "./subscription.controller";
import { requireAuth } from "../auth/auth.middleware";

const router = express.Router();

router.post("/create-sub", requireAuth, createSubscription);
router.post("/webhook", razorpayWebhook);

export default router;

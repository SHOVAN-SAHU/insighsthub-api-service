import express from "express";
import { getPlans, createPlan } from "./plan.controller";
import { requireAuth, isAdmin } from "../auth/auth.middleware";

const router = express.Router();

router.get("/", getPlans);
router.post("/", requireAuth, isAdmin, createPlan);

export default router;

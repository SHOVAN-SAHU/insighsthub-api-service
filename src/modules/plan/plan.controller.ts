import { Request, Response } from "express";
import Plan from "./plan.model";
import { razorpayInstance } from "../../config/razorpay";

// GET /plans (public)
export const getPlans = async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await Plan.find({ isActive: true })
      .sort({ price: 1 })
      .select("-razorpayPlanId -__v");

    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

// admin only
export const createPlan = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, price, durationDays, limits } = req.body as {
      name: string;
      price: number;
      durationDays: number;
      limits: { uploads: number; asks: number };
    };

    if (!durationDays || durationDays !== 30) {
      res.status(400).json({ error: "Duration days must be 30" });
      return;
    }

    // Step 1: create plan in Razorpay
    const razorpayPlan = await razorpayInstance.plans.create({
      period: "monthly",
      interval: durationDays / 30, // 1 for monthly
      item: {
        name,
        amount: price, // in paise — for ₹499 must be 49900
        currency: "INR",
        description: `${name} plan`,
      },
    });

    // Step 2: Create plan with razorpayPlanId in db
    const plan = await Plan.create({
      name,
      price,
      durationDays,
      limits,
      razorpayPlanId: razorpayPlan.id,
    });

    res.status(201).json(plan);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

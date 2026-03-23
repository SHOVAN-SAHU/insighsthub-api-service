import Plan from "./plan.model.js";
import { razorpayInstance } from "../../config/razorpay.js";

// GET /plans (public)
export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .sort({ price: 1 })
      .select("-razorpayPlanId -__v");

    return res.json(plans);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// admin only
export const createPlan = async (req, res) => {
  try {
    const { name, price, durationDays, limits } = req.body;

    if (!durationDays || durationDays !== 30) {
      return res.status(400).json({ error: "Duration days must be 30" });
    }

    // Step 1: create plan in Razorpay
    const razorpayPlan = await razorpayInstance.plans.create({
      period: "monthly", // or "yearly"
      interval: durationDays / 30, // 1 for monthly, 12 for yearly
      item: {
        name,
        amount: price, // in paise for 499 must be 49900
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

    return res.status(201).json(plan);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

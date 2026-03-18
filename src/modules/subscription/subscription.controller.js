import crypto from "crypto";
import Plan from "../plan/plan.model.js";
import User from "../user/user.model.js";
import { razorpayInstance } from "../../config/razorpay.js";
import Subscription from "./subscription.model.js";
import Usage from "../usage/usage.model.js";

// Recurring subscription
export const createSubscription = async (req, res) => {
  try {
    const user = req.user; // auth middleware
    const { planId } = req.body;

    if (user.currentPeriodEnd && user.currentPeriodEnd > new Date()) {
      return res.status(400).json({
        message:
          "You already have an active plan. It expires on " +
          user.currentPeriodEnd,
      });
    }

    // check for pending subscription within last 30 mins
    const pendingSubscription = await Subscription.findOne({
      userId: user._id,
      status: "CREATED",
    });

    if (pendingSubscription) {
      const isWithin30Mins =
        pendingSubscription.createdAt > new Date(Date.now() - 30 * 60 * 1000);

      if (isWithin30Mins) {
        return res.status(200).json({
          message:
            "You have a pending subscription. Please complete the payment.",
          alreadyPending: true,
          subscriptionId: pendingSubscription.razorpaySubscriptionId,
          shortUrl: pendingSubscription.razorpayShortUrl,
        });
      } else {
        try {
          await razorpayInstance.subscriptions.cancel(
            pendingSubscription.razorpaySubscriptionId,
          );
        } catch (err) {
          // ignore if already cancelled/completed on Razorpay side
          console.log("Razorpay cancel skipped:", err.message);
        }

        pendingSubscription.status = "CANCELLED";
        await pendingSubscription.save();
      }
    }

    // fetch plan from DB
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive)
      return res.status(404).json({ message: "Invalid plan" });

    // create Razorpay subscription
    const razorpaySubscription = await razorpayInstance.subscriptions.create({
      plan_id: plan.razorpayPlanId,
      customer_notify: 1, // send email/SMS
      total_count: Math.ceil(plan.durationDays / 30), // months
      expire_by: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    // store subscription in DB
    const subscription = await Subscription.create({
      userId: user._id,
      planId: plan._id,
      razorpaySubscriptionId: razorpaySubscription.id,
      razorpayShortUrl: razorpaySubscription.short_url,
      status: "CREATED",
      startDate: new Date(),
      endDate: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
    });

    return res.status(201).json({
      subscription,
      razorpaySubscription,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

// Razorpay webhook handler
export const razorpayWebhook = async (req, res) => {
  try {
    console.log("From Webhook");
    const sig = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_KEY_SECRET;

    // verify signature using raw buffer
    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");

    if (sig !== expected) {
      console.log("Unmatched sig");
      return res.status(400).send("Invalid signature");
    }

    const payload = JSON.parse(req.body.toString());
    const event = payload.event;
    console.log("event", event);

    if (event === "subscription.activated") {
      const subscriptionId = payload.payload.subscription.entity.id;

      const subscription = await Subscription.findOne({
        razorpaySubscriptionId: subscriptionId,
      });
      if (!subscription) return res.status(404).send("Subscription not found");

      // idempotency
      if (subscription.status === "PAID") return res.json({ status: "ok" });

      const plan = await Plan.findById(subscription.planId);
      const user = await User.findById(subscription.userId);

      const now = new Date();
      const baseDate =
        user.currentPeriodEnd && user.currentPeriodEnd > now
          ? user.currentPeriodEnd
          : now;

      const endDate = new Date(baseDate);
      endDate.setDate(endDate.getDate() + plan.durationDays);

      subscription.status = "PAID";
      subscription.startDate = now;
      subscription.endDate = endDate;
      await subscription.save();

      user.plan = plan.name;
      user.currentPeriodEnd = endDate;
      await user.save();

      await Usage.findOneAndUpdate(
        { userId: user._id },
        { uploadsUsed: 0, asksUsed: 0, resetAt: endDate },
        { upsert: true },
      );

      console.log("Subscription activated for user", user.name || user.email);
    }

    if (event === "payment.captured") {
      // payment.captured fires for all payments, no subscription info here
      const paymentId = payload.payload.payment.entity.id;
      console.log("Payment captured:", paymentId);
    }

    if (event === "payment.failed") {
      const subscriptionId = payload.payload.payment.entity.subscription_id;
      const subscription = await Subscription.findOne({
        razorpaySubscriptionId: subscriptionId,
      });
      if (!subscription) return;

      subscription.status = "FAILED";
      await subscription.save();
    }

    if (event === "subscription.cancelled") {
      const subscriptionId = payload.payload.subscription.entity.id;

      const subscription = await Subscription.findOne({
        razorpaySubscriptionId: subscriptionId,
      });
      if (!subscription) return res.status(404).send("Subscription not found");

      subscription.status = "CANCELLED";
      await subscription.save();

      await User.findByIdAndUpdate(subscription.userId, {
        cancelAtPeriodEnd: true,
      });

      console.log("Subscription cancelled for user", subscription.userId);
    }

    return res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// One-time order (optional)
// export const createOrder = async (req, res) => {
//   try {
//     const { planId } = req.body;
//     const userId = req.user._id;

//     if (!planId) return res.status(400).json({ message: "Plan ID required" });

//     // fetch plan from DB
//     const plan = await Plan.findById(planId);
//     if (!plan || !plan.isActive)
//       return res.status(404).json({ message: "Invalid plan" });

//     // Razorpay expects amount in paise
//     const order = await razorpayInstance.orders.create({
//       amount: plan.price,
//       currency: "INR",
//       receipt: `receipt_${Date.now()}`,
//     });

//     // store in DB
//     await Subscription.create({
//       userId,
//       planId,
//       razorpayOrderId: order.id,
//       status: "CREATED",
//     });

//     return res.json({
//       orderId: order.id,
//       amount: order.amount,
//     });
//   } catch (err) {
//     return res.status(400).json({ message: err.message });
//   }
// };

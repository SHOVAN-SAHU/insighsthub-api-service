import crypto from "crypto";
import Plan from "../plan/plan.model.js";
import { razorpayInstance } from "../../config/razorpay.js";
import Subscription from "./subscription.model.js";

import {
  handleSubscriptionActivated,
  handleSubscriptionCharged,
  handlePaymentCaptured,
  handlePaymentFailed,
  handleSubscriptionCancelled,
} from "./subscription.service.js";

const EVENT_HANDLERS = {
  "subscription.activated": handleSubscriptionActivated,
  "subscription.charged": handleSubscriptionCharged,
  "payment.captured": handlePaymentCaptured,
  "payment.failed": handlePaymentFailed,
  "subscription.cancelled": handleSubscriptionCancelled,
};

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
      notify_info: {
        notify_email: user.email,
      },
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

    const handler = EVENT_HANDLERS[event];

    if (handler) {
      await handler(payload);
    } else {
      console.log("Unhandled event:", event);
    }

    return res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

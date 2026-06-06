import crypto from "crypto";
import { Request, Response } from "express";
import Plan from "../plan/plan.model";
import { razorpayInstance } from "../../config/razorpay";
import Subscription from "./subscription.model";

import {
  handleSubscriptionActivated,
  handleSubscriptionCharged,
  handlePaymentCaptured,
  handlePaymentFailed,
  handleSubscriptionCancelled,
  RazorpayWebhookPayload,
} from "./subscription.service";

type WebhookHandler = (payload: RazorpayWebhookPayload) => Promise<void>;

const EVENT_HANDLERS: Record<string, WebhookHandler> = {
  "subscription.activated": handleSubscriptionActivated,
  "subscription.charged": handleSubscriptionCharged,
  "payment.captured": handlePaymentCaptured,
  "payment.failed": handlePaymentFailed,
  "subscription.cancelled": handleSubscriptionCancelled,
};

// Recurring subscription
export const createSubscription = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user; // auth middleware
    const { planId } = req.body as { planId: string };

    if (user.currentPeriodEnd && user.currentPeriodEnd > new Date()) {
      res.status(400).json({
        message:
          "You already have an active plan. It expires on " +
          user.currentPeriodEnd,
      });
      return;
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
        res.status(200).json({
          message:
            "You have a pending subscription. Please complete the payment.",
          alreadyPending: true,
          razorpaySubscriptionId: pendingSubscription.razorpaySubscriptionId,
          razorpayShortUrl: pendingSubscription.razorpayShortUrl,
        });
        return;
      } else {
        console.log(
          "cancelling pending sub:",
          pendingSubscription.razorpaySubscriptionId,
        );
        try {
          await razorpayInstance.subscriptions.cancel(
            pendingSubscription.razorpaySubscriptionId!,
          );
        } catch (err) {
          // ignore if already cancelled/completed on Razorpay side
          console.log("Razorpay cancel skipped:", (err as Error).message);
        }

        pendingSubscription.status = "CANCELLED";
        await pendingSubscription.save();
      }
    }

    // fetch plan from DB
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      res.status(404).json({ message: "Invalid plan" });
      return;
    }

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

    res.status(201).json({
      razorpaySubscriptionId: subscription.razorpaySubscriptionId,
      razorpayShortUrl: subscription.razorpayShortUrl,
      message:
        "Subscription created please confirm the payment before the url expired",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: (err as Error).message });
  }
};

// Razorpay webhook handler
export const razorpayWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    console.log("From Webhook");
    const sig = req.headers["x-razorpay-signature"] as string | undefined;
    const secret = process.env.RAZORPAY_KEY_SECRET!;

    // verify signature using raw buffer
    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.body as Buffer)
      .digest("hex");

    if (sig !== expected) {
      console.log("Unmatched sig");
      res.status(400).send("Invalid signature");
      return;
    }

    const payload = JSON.parse(
      (req.body as Buffer).toString(),
    ) as RazorpayWebhookPayload;
    const event = payload.event;
    console.log("event", event);

    const handler = EVENT_HANDLERS[event];

    if (handler) {
      await handler(payload);
    } else {
      console.log("Unhandled event:", event);
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

import Usage from "../usage/usage.model";
import User from "../user/user.model";
import Subscription from "./subscription.model";
import Plan from "../plan/plan.model";
import { sendPaymentSuccessEmail } from "../../config/email";

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: { id: string } };
    payment?: {
      entity: {
        id: string;
        amount: number;
        subscription_id?: string;
      };
    };
  };
}

export const handleSubscriptionActivated = async (
  payload: RazorpayWebhookPayload,
): Promise<void> => {
  const subscriptionId = payload.payload.subscription!.entity.id;

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: subscriptionId,
  });
  if (!subscription) throw new Error("Subscription not found");
  if (subscription.status === "PAID") return; // idempotency

  const [plan, user] = await Promise.all([
    Plan.findById(subscription.planId),
    User.findById(subscription.userId),
  ]);

  if (!plan || !user) throw new Error("Plan or user not found");

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
};

export const handleSubscriptionCharged = async (
  payload: RazorpayWebhookPayload,
): Promise<void> => {
  const subscriptionId = payload.payload.subscription!.entity.id;
  const amountPaid = payload.payload.payment!.entity.amount / 100;

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: subscriptionId,
  });
  if (!subscription) throw new Error("Subscription not found");

  const [plan, user] = await Promise.all([
    Plan.findById(subscription.planId),
    User.findById(subscription.userId),
  ]);
  if (!plan || !user) throw new Error("Plan or user not found");

  await sendPaymentSuccessEmail(user.email, {
    name: user.name,
    planName: plan.name,
    amount: amountPaid,
    expiresAt: subscription.endDate!,
  });

  console.log("Payment charged for user", user.name || user.email);
};

export const handlePaymentCaptured = async (
  payload: RazorpayWebhookPayload,
): Promise<void> => {
  const paymentId = payload.payload.payment!.entity.id;
  console.log("Payment captured:", paymentId);
};

export const handlePaymentFailed = async (
  payload: RazorpayWebhookPayload,
): Promise<void> => {
  const subscriptionId = payload.payload.payment!.entity.subscription_id;

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: subscriptionId,
  });
  if (!subscription) return;

  subscription.status = "FAILED";
  await subscription.save();
};

export const handleSubscriptionCancelled = async (
  payload: RazorpayWebhookPayload,
): Promise<void> => {
  const subscriptionId = payload.payload.subscription!.entity.id;

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: subscriptionId,
  });
  if (!subscription) throw new Error("Subscription not found");

  subscription.status = "CANCELLED";
  await subscription.save();

  await User.findByIdAndUpdate(subscription.userId, {
    cancelAtPeriodEnd: true,
  });

  console.log("Subscription cancelled for user", subscription.userId);
};

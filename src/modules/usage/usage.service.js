import Usage from "./usage.model.js";
import Plan from "../plan/plan.model.js";
import Subscription from "../subscription/subscription.model.js"

// helper: fallback reset for FREE users
const getNextResetDate = () => {
  const now = new Date();
  now.setDate(now.getDate() + 30);
  return now;
};

// 1. get or create usage
export const getOrCreateUsage = async (user) => {
  let usage = await Usage.findOne({ userId: user._id });

  if (!usage) {
    usage = await Usage.create({
      userId: user._id,
      uploadsUsed: 0,
      asksUsed: 0,
      resetAt: user.currentPeriodEnd || getNextResetDate(),
    });
  }

  return usage;
};

// 2. reset if needed
export const resetIfNeeded = async (usage, user) => {
  const now = new Date();

  if (now > usage.resetAt) {
    usage.uploadsUsed = 0;
    usage.asksUsed = 0;

    const nextReset =
      user.currentPeriodEnd && user.currentPeriodEnd > now
        ? user.currentPeriodEnd
        : getNextResetDate(); // fallback for expired/free users

    usage.resetAt = nextReset;

    await usage.save();
  }

  return usage;
};

// 3. check + consume quota (CORE LOGIC)
export const checkAndConsumeQuota = async (user, type) => {
  const now = new Date();

  // STEP 1: Handle expired subscription
  if (user.currentPeriodEnd && user.currentPeriodEnd < now) {
    user.plan = "FREE";
    user.currentPeriodEnd = null;
    await user.save();

    await Subscription.findOneAndUpdate(
      { userId: user._id, status: {$in: ["PAID"] }},
      { status: "EXPIRED" }
    );
  }

  const reqType = type.toUpperCase();

  // STEP 2: get plan from DB
  const planDoc = await Plan.findOne({ name: user.plan });

  if (!planDoc) {
    throw new Error("Invalid plan");
  }

  const limits = planDoc.limits;

  // STEP 3: usage lifecycle
  let usage = await getOrCreateUsage(user);
  usage = await resetIfNeeded(usage, user);

  // STEP 4: atomic quota consume
  let query = { userId: user._id };
  let update = {};

  if (reqType === "ASK") {
    query.asksUsed = { $lt: limits.asks };
    update.$inc = { asksUsed: 1 };
  } else if (reqType === "UPLOAD") {
    query.uploadsUsed = { $lt: limits.uploads };
    update.$inc = { uploadsUsed: 1 };
  } else {
    throw new Error("Invalid quota type");
  }

  const updated = await Usage.findOneAndUpdate(
    query,
    update,
    { new: true }
  );

  if (!updated) {
    throw new Error(`${reqType} quota exceeded`);
  }

  return updated;
};
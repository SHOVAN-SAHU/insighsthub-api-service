import { findUserById } from "../user/user.service.js";
import { Usage } from "../usage/usage.model.js";

export const changeUserPlan = async (userId, newPlan) => {
  const now = new Date();

  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");

  // 🔥 set subscription period
  let currentPeriodEnd = null;

  if (newPlan !== "FREE") {
    currentPeriodEnd = new Date(now);
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
  }

  // ✅ update user
  user.plan = newPlan;
  user.currentPeriodEnd = currentPeriodEnd;
  await user.save();

  // 🔥 reset usage
  await Usage.findOneAndUpdate(
    { userId },
    {
      uploadsUsed: 0,
      asksUsed: 0,
      resetAt: new Date(now.setDate(now.getDate() + 30)),
    },
    { upsert: true, new: true }
  );

  return user;
};


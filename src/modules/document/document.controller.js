import { checkAndConsumeQuota } from "../usage/usage.service.js";

export const uploadDocument = async (req, res) => {
  try {
    const user = req.user;

    // 🔥 quota check
    await checkAndConsumeQuota(user, "upload");

    // 👉 mock upload for now
    return res.json({
      message: "Document uploaded successfully",
    });

  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};
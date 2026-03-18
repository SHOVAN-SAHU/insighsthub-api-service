import { checkAndConsumeQuota } from "../usage/usage.service.js";

export const askQuestion = async (req, res) => {
  try {
    const user = req.user;
    const { documentId, question, spaceType } = req.body;

    // 🔥 quota check
    await checkAndConsumeQuota(user, "ASK");

    // 👉 fake response for now (RAG comes later)
    return res.json({
      answer: "This is a dummy answer",
      documentId,
      question,
      spaceType
    });

  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};
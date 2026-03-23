import { checkAndConsumeQuota } from "../usage/usage.service.js";
import Space from "../space/space.model.js";
import Usage from "../usage/usage.model.js";
import { callRagAsk } from "../../config/ragApi.js";
import { findUserById } from "../user/user.service.js";

export const askQuestion = async (req, res) => {
  try {
    const user = req.user;
    const { spaceId } = req.params;
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    // Validate space access
    const space = await Space.findOne({
      _id: spaceId,
      isActive: true,
      $or: [{ owner: user._id }, { "participants.user": user._id }],
    });

    if (!space) {
      return res.status(404).json({
        message: "Space not found",
      });
    }

    // Resolve quota owner (CRITICAL)
    const quotaOwnerUser = await findUserById(space.owner);

    let quotaConsumed = false;

    // Consume ASK quota
    try {
      await checkAndConsumeQuota(quotaOwnerUser, "ASK");
      quotaConsumed = true;
    } catch (err) {
      if (err.message === "ASK_QUOTA_EXCEEDED") {
        return res.status(403).json({
          message: "Ask quota exceeded",
        });
      }

      if (err.message === "INVALID_PLAN") {
        return res.status(400).json({
          message: "Invalid plan",
        });
      }

      throw err;
    }

    //  Call RAG service
    let ragResponse;
    try {
      const response = await callRagAsk({
        question,
        space_id: space._id,
        user_id: quotaOwnerUser._id,
        space_type: space.type,
      });

      ragResponse = response.data;
      console.log(ragResponse);
    } catch (err) {
      console.error("RAG Ask Failed:", err.message);

      if (quotaConsumed) {
        await Usage.findOneAndUpdate(
          { userId: quotaOwnerUser._id, asksUsed: { $gt: 0 } },
          { $inc: { asksUsed: -1 } },
        );
      }

      return res.status(500).json({
        message: "Failed to process question",
      });
    }

    return res.json({
      answer: ragResponse.answer,
      contextUsed: ragResponse.context_used,
    });
  } catch (err) {
    console.error("Ask Error:", err);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

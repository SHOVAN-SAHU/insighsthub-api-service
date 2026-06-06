import { Request, Response } from "express";
import { checkAndConsumeQuota } from "../usage/usage.service";
import Space from "../space/space.model";
import Usage from "../usage/usage.model";
import { callRagAsk } from "../../config/ragApi";
import { findUserById } from "../user/user.service";

export const askQuestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { spaceId } = req.params;
    const { question } = req.body as { question: string };

    if (!question || question.trim().length === 0) {
      res.status(400).json({ message: "Question is required" });
      return;
    }

    // Validate space access
    const space = await Space.findOne({
      _id: spaceId,
      isActive: true,
      $or: [{ owner: user._id }, { "participants.user": user._id }],
    });

    if (!space) {
      res.status(404).json({ message: "Space not found" });
      return;
    }

    // Resolve quota owner (CRITICAL)
    const quotaOwnerUser = await findUserById(space.owner);

    let quotaConsumed = false;

    // Consume ASK quota
    try {
      await checkAndConsumeQuota(quotaOwnerUser!, "ASK");
      quotaConsumed = true;
    } catch (err) {
      if ((err as Error).message === "ASK_QUOTA_EXCEEDED") {
        res.status(403).json({ message: "Ask quota exceeded" });
        return;
      }

      if ((err as Error).message === "INVALID_PLAN") {
        res.status(400).json({ message: "Invalid plan" });
        return;
      }

      throw err;
    }

    // Call RAG service
    let ragResponse: { answer: string; context_used: unknown };
    try {
      const response = await callRagAsk({
        question,
        space_id: space._id,
        user_id: quotaOwnerUser!._id,
        space_type: space.type,
      });

      ragResponse = response.data as { answer: string; context_used: unknown };
      console.log(ragResponse);
    } catch (err) {
      console.error("RAG Ask Failed:", (err as Error).message);

      if (quotaConsumed) {
        await Usage.findOneAndUpdate(
          { userId: quotaOwnerUser!._id, asksUsed: { $gt: 0 } },
          { $inc: { asksUsed: -1 } },
        );
      }

      res.status(500).json({ message: "Failed to process question" });
      return;
    }

    res.json({
      answer: ragResponse.answer,
      contextUsed: ragResponse.context_used,
    });
  } catch (err) {
    console.error("Ask Error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

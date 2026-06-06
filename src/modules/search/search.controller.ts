import { Request, Response } from "express";
import mongoose from "mongoose";
import Space from "../space/space.model";
import User from "../user/user.model";

export const searchUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const currentUser = req.user;
    const { q, spaceId, limit = 10 } = req.query as {
      q?: string;
      spaceId?: string;
      limit?: string | number;
    };

    // Clamp limit
    const parsedLimit = Math.min(parseInt(String(limit)) || 10, 20);

    // Escape regex
    const escapeRegex = (text: string): string =>
      text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const safeQuery = escapeRegex((q ?? "").trim());
    const regex = new RegExp(safeQuery, "i");

    const excludeUserIds = new Set<string>();

    // Always exclude self (clean UX)
    excludeUserIds.add(currentUser._id.toString());

    // If spaceId provided → exclude existing members
    if (spaceId && mongoose.Types.ObjectId.isValid(spaceId)) {
      const space = await Space.findById(spaceId).select("participants owner");

      if (space) {
        space.participants.forEach((p) =>
          excludeUserIds.add(p.user.toString()),
        );

        excludeUserIds.add(space.owner.toString());
      }
    }

    // Build query
    const users = await User.find({
      $and: [
        {
          $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }],
        },
        {
          _id: {
            $nin: Array.from(excludeUserIds),
          },
        },
      ],
    })
      .select("_id name email")
      .limit(parsedLimit)
      .lean();

    res.json({ results: users });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

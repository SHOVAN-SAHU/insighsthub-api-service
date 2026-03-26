import mongoose from "mongoose";
import Space from "../space/space.model.js";
import User from "../user/user.model.js";

export const searchUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    const { q, spaceId, limit = 10 } = req.query;

    // Empty search = reject
    // if (!q || q.trim().length < 2) {
    //   return res.status(400).json({
    //     message: "Search query must be at least 2 characters",
    //   });
    // }

    // Clamp limit
    const parsedLimit = Math.min(parseInt(limit) || 10, 20);

    // Escape regex (important, you likely would've skipped this)
    const escapeRegex = (text) =>
      text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const safeQuery = escapeRegex(q.trim());

    const regex = new RegExp(safeQuery, "i");

    let excludeUserIds = new Set();

    // Always exclude self (clean UX)
    excludeUserIds.add(currentUser._id.toString());

    // If spaceId provided → exclude existing members
    if (spaceId && mongoose.Types.ObjectId.isValid(spaceId)) {
      const space = await Space.findById(spaceId).select("participants owner");

      if (space) {
        space.participants.forEach((p) =>
          excludeUserIds.add(p.user.toString())
        );

        excludeUserIds.add(space.owner.toString());
      }
    }

    // Build query
    const users = await User.find({
      $and: [
        {
          $or: [
            { name: { $regex: regex } },
            { email: { $regex: regex } },
          ],
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

    return res.json({
      results: users,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};
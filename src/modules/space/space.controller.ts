import { Request, Response } from "express";
import mongoose from "mongoose";
import Space from "./space.model";
import User from "../user/user.model";

export const createSpace = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const {
      name,
      type,
      participants = [],
      description = "",
    } = req.body as {
      name: string;
      type: string;
      participants?: string[];
      description?: string;
    };

    if (!name || !type) {
      res.status(400).json({ message: "Name and type are required" });
      return;
    }

    if (!["personal", "team"].includes(type)) {
      res
        .status(400)
        .json({ message: "Invalid space type - either personal or team" });
      return;
    }

    // Personal space cannot have extra participants
    if (type === "personal" && participants.length > 0) {
      res.status(400).json({
        message: "Personal space cannot have participants",
      });
      return;
    }

    // Participants array
    let finalParticipants: { user: mongoose.Types.ObjectId | string; role: string }[] = [
      { user: user._id, role: "owner" },
    ];

    if (type === "team") {
      const uniqueUsers = new Set(participants.map((p) => p.toString()));

      uniqueUsers.forEach((userId) => {
        if (userId !== user._id.toString()) {
          finalParticipants.push({ user: userId, role: "member" });
        }
      });
    }

    if (description.length > 500) {
      res.status(400).json({
        message: "Description too long (max 500 chars)",
      });
      return;
    }
    const cleanDescription = description.trim();

    const space = await Space.create({
      name,
      type,
      owner: user._id,
      participants: finalParticipants,
      description: cleanDescription,
    });

    res.status(201).json(space);
  } catch (err) {
    // handle duplicate name error
    if ((err as { code?: number }).code === 11000) {
      res.status(400).json({
        message: "You already have a space with this name",
      });
      return;
    }

    res.status(500).json({ message: (err as Error).message });
  }
};

export const getUserSpaces = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;

    const spaces = await Space.find({
      "participants.user": user._id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .populate("participants.user", "name email picture")
      .populate("owner", "name email picture");

    res.json(spaces);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const updateSpaceMeta = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { spaceId } = req.params;
    const { name, description } = req.body as {
      name?: string;
      description?: string;
    };

    const space = await Space.findById(spaceId);

    if (!space || !space.isActive) {
      res.status(404).json({ message: "Space not found" });
      return;
    }

    // Only owner
    if (space.owner.toString() !== user._id.toString()) {
      res.status(403).json({ message: "Not allowed" });
      return;
    }

    if (name !== undefined) {
      space.name = name.trim();
    }

    if (description !== undefined) {
      if (description.length > 500) {
        res.status(400).json({ message: "Description too long" });
        return;
      }
      space.description = description.trim();
    }

    await space.save();

    res.json(space);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      res.status(400).json({ message: "Space name already exists" });
      return;
    }
    res.status(500).json({ message: (err as Error).message });
  }
};

export const addMembers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { spaceId } = req.params;
    const { members = [] } = req.body as { members?: string[] };

    const space = await Space.findById(spaceId);

    if (!space || !space.isActive) {
      res.status(404).json({ message: "Space not found" });
      return;
    }

    if (space.type === "personal") {
      res.status(400).json({ message: "Cannot add members to personal space" });
      return;
    }

    // Only owner
    if (space.owner.toString() !== user._id.toString()) {
      res.status(403).json({ message: "Not allowed" });
      return;
    }

    if (!Array.isArray(members) || members.length === 0) {
      res.status(400).json({ message: "Members array required" });
      return;
    }

    // 🚨 Prevent abuse
    if (members.length > 50) {
      res.status(400).json({ message: `Cannot add more than 50 members at once` });
      return;
    }

    // ✅ Precompute existing participants
    const existingParticipants = new Set(
      space.participants.map((p) => p.user.toString()),
    );

    const ownerId = space.owner.toString();

    // ✅ Validate ObjectIds first
    const validObjectIds = members.filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    // ❗ Everything else is auto-skipped
    const skipped = members.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );

    // ✅ Check which users actually exist
    const users = await User.find({
      _id: { $in: validObjectIds },
    }).select("_id");

    const validUserSet = new Set(users.map((u) => u._id.toString()));

    const added: string[] = [];

    for (const memberId of validObjectIds) {
      // ❌ Not a real user
      if (!validUserSet.has(memberId)) {
        skipped.push(memberId);
        continue;
      }

      // ❌ Already exists OR owner
      if (existingParticipants.has(memberId) || memberId === ownerId) {
        skipped.push(memberId);
        continue;
      }

      // ✅ Add
      space.participants.push({
        user: new mongoose.Types.ObjectId(memberId),
        role: "member",
      });

      existingParticipants.add(memberId);
      added.push(memberId);
    }

    await space.save();

    res.json({ message: "Members processed", added, skipped });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const removeMembers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    const { spaceId } = req.params;
    const { members = [] } = req.body as { members?: string[] };

    const space = await Space.findById(spaceId);

    if (!space || !space.isActive) {
      res.status(404).json({ message: "Space not found" });
      return;
    }

    if (space.type === "personal") {
      res.status(400).json({ message: "Cannot remove members from personal space" });
      return;
    }

    if (!Array.isArray(members) || members.length === 0) {
      res.status(400).json({ message: "Members array required" });
      return;
    }

    const requesterId = user._id.toString();
    const ownerId = space.owner.toString();

    const participantIds = space.participants.map((p) => p.user.toString());

    // Check requester is part of space
    if (!participantIds.includes(requesterId)) {
      res.status(403).json({ message: "You are not a member of this space" });
      return;
    }

    // Owner trying to remove themselves
    if (requesterId === ownerId && members.includes(ownerId)) {
      res.status(400).json({ message: "Owner cannot remove themselves" });
      return;
    }

    const removed: string[] = [];
    const skipped: string[] = [];

    // Strict rule for non-owner
    if (requesterId !== ownerId) {
      if (members.length !== 1 || members[0] !== requesterId) {
        res.status(403).json({ message: "You can only remove yourself" });
        return;
      }
    }

    // Process removals
    space.participants = space.participants.filter((p) => {
      const userId = p.user.toString();

      if (!members.includes(userId)) return true;

      // Never remove owner (extra safety)
      if (userId === ownerId) return true;

      removed.push(userId);
      return false;
    });

    // Track skipped (invalid or not in space)
    members.forEach((id) => {
      if (!participantIds.includes(id)) {
        skipped.push(id);
      }
    });

    await space.save();

    res.json({ message: "Members processed", removed, skipped });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

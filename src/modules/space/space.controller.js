import mongoose from "mongoose";
import Space from "./space.model.js";
import User from "../user/user.model.js";

export const createSpace = async (req, res) => {
  try {
    const user = req.user;
    const { name, type, participants = [], description = "" } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required" });
    }

    if (!["personal", "team"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Invalid space type - either personal or team" });
    }

    // Personal space cannot have extra participants
    if (type === "personal" && participants.length > 0) {
      return res.status(400).json({
        message: "Personal space cannot have participants",
      });
    }

    // Participants array
    let finalParticipants = [{ user: user._id, role: "owner" }];

    if (type === "team") {
      const uniqueUsers = new Set(participants.map((p) => p.toString()));

      uniqueUsers.forEach((userId) => {
        if (userId !== user._id.toString()) {
          finalParticipants.push({ user: userId, role: "member" });
        }
      });
    }

    if (description.length > 500) {
      return res.status(400).json({
        message: "Description too long (max 500 chars)",
      });
    }
    const cleanDescription = description.trim();

    const space = await Space.create({
      name,
      type,
      owner: user._id,
      participants: finalParticipants,
      description: cleanDescription,
    });

    return res.status(201).json(space);
  } catch (err) {
    // handle duplicate name error
    if (err.code === 11000) {
      return res.status(400).json({
        message: "You already have a space with this name",
      });
    }

    return res.status(500).json({ message: err.message });
  }
};

export const getUserSpaces = async (req, res) => {
  try {
    const user = req.user;

    const spaces = await Space.find({
      "participants.user": user._id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .populate("participants.user", "name email picture")
      .populate("owner", "name email picture");

    return res.json(spaces);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateSpaceMeta = async (req, res) => {
  try {
    const user = req.user;
    const { spaceId } = req.params;
    const { name, description } = req.body;

    const space = await Space.findById(spaceId);

    if (!space || !space.isActive) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Only owner
    if (space.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (name !== undefined) {
      space.name = name.trim();
    }

    if (description !== undefined) {
      if (description.length > 500) {
        return res.status(400).json({
          message: "Description too long",
        });
      }
      space.description = description.trim();
    }

    await space.save();

    return res.json(space);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Space name already exists",
      });
    }
    return res.status(500).json({ message: err.message });
  }
};

export const addMembers = async (req, res) => {
  try {
    const user = req.user;
    const { spaceId } = req.params;
    const { members = [] } = req.body;

    const space = await Space.findById(spaceId);

    if (!space || !space.isActive) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (space.type === "personal") {
      return res.status(400).json({
        message: "Cannot add members to personal space",
      });
    }

    // Only owner
    if (space.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        message: "Members array required",
      });
    }

    // 🚨 Prevent abuse
    if (members.length > 50) {
      return res.status(400).json({
        message: `Cannot add more than 50 members at once`,
      });
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

    const added = [];

    for (let memberId of validObjectIds) {
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
        user: memberId,
        role: "member",
      });

      existingParticipants.add(memberId);
      added.push(memberId);
    }

    await space.save();

    return res.json({
      message: "Members processed",
      added,
      skipped,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const removeMembers = async (req, res) => {
  try {
    const user = req.user;
    const { spaceId } = req.params;
    const { members = [] } = req.body;

    const space = await Space.findById(spaceId);

    if (!space || !space.isActive) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (space.type === "personal") {
      return res.status(400).json({
        message: "Cannot remove members from personal space",
      });
    }

    // Only owner
    if (space.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        message: "Members array required",
      });
    }

    const removed = [];
    const skipped = [];

    space.participants = space.participants.filter((p) => {
      const userId = p.user.toString();

      // Never remove owner
      if (userId === space.owner.toString()) return true;

      if (members.includes(userId)) {
        removed.push(userId);
        return false;
      }

      return true;
    });

    // track skipped (not found)
    members.forEach((id) => {
      const exists = space.participants.some((p) => p.user.toString() === id);
      if (!exists) skipped.push(id);
    });

    await space.save();

    return res.json({
      message: "Members processed",
      removed,
      skipped,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// export const addMembers = async (req, res) => {
//   try {
//     const user = req.user;
//     const { spaceId } = req.params;
//     const { members = [] } = req.body;

//     const space = await Space.findById(spaceId);

//     if (!space || !space.isActive) {
//       return res.status(404).json({ message: "Space not found" });
//     }

//     if (space.type === "personal") {
//       return res.status(400).json({
//         message: "Cannot add members to personal space",
//       });
//     }

//     // Only owner
//     if (space.owner.toString() !== user._id.toString()) {
//       return res.status(403).json({ message: "Not allowed" });
//     }

//     if (!Array.isArray(members) || members.length === 0) {
//       return res.status(400).json({
//         message: "Members array required",
//       });
//     }

//     const added = [];
//     const skipped = [];

//     for (let memberId of members) {
//       const exists = space.participants.some(
//         (p) => p.user.toString() === memberId
//       );

//       if (exists || memberId === space.owner.toString()) {
//         skipped.push(memberId);
//         continue;
//       }

//       space.participants.push({
//         user: memberId,
//         role: "member",
//       });

//       added.push(memberId);
//     }

//     await space.save();

//     return res.json({
//       message: "Members processed",
//       added,
//       skipped,
//     });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// export const deleteSpace = async (req, res) => {
//   try {
//     const user = req.user;
//     const { spaceId } = req.params;

//     const space = await Space.findById(spaceId);

//     if (!space || !space.isActive) {
//       return res.status(404).json({ message: "Space not found" });
//     }

//     // ❌ Only owner can delete
//     if (space.owner.toString() !== user._id.toString()) {
//       return res.status(403).json({ message: "Not allowed" });
//     }

//     // ✅ Soft delete space
//     space.isActive = false;
//     await space.save();

//     // ✅ Soft delete all documents in this space
//     // await DocumentMeta.updateMany(
//     //   { space: space._id },
//     //   { status: "DELETED" }
//     // );

//     // Call RAG service bulk delete by space_id
//     // await ragService.deleteBySpace(space._id);

//     return res.json({ message: "Space deleted successfully" });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

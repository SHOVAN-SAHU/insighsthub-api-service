import express from "express";
import {
  createSpace,
  getUserSpaces,
  updateSpaceMeta,
  addMembers,
  removeMembers,
  deleteSpace,
} from "./space.controller.js";

import { requireAuth } from "../auth/auth.middleware.js";

const router = express.Router();

// All routes require auth
router.use(requireAuth);

router.post("/", createSpace);

router.get("/", getUserSpaces);

router.patch("/:spaceId", updateSpaceMeta);
router.post("/:spaceId/members", addMembers);
router.delete("/:spaceId/members", removeMembers);

router.delete("/:spaceId", deleteSpace);

export default router;
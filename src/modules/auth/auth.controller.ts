import { Request, Response } from "express";
import { Types } from "mongoose";
import { handleGoogleLogin } from "./auth.service";
import { setAuthCookie, clearAuthCookie } from "./cookie.util";
import Usage from "../usage/usage.model";

export const googleLogin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const idToken =
      (req.body as { token?: string; credential?: string }).token ||
      (req.body as { token?: string; credential?: string }).credential;

    if (!idToken) {
      res.status(400).json({ error: "Google token missing" });
      return;
    }

    const { user, token } = await handleGoogleLogin(idToken);

    setAuthCookie(res, token);

    const used = await Usage.findOne({ userId: user._id as Types.ObjectId });
    if (used) {
      res.json({
        user: {
          ...user,
          uploadUsed: used.uploadsUsed,
          askedUsed: used.asksUsed,
        },
      });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Authentication failed" });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully" });
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user.toObject() as Record<string, unknown>;
  const used = await Usage.findOne({ userId: user._id as Types.ObjectId });
  res.json({
    user: { ...user, uploadUsed: used?.uploadsUsed, askedUsed: used?.asksUsed },
  });
};

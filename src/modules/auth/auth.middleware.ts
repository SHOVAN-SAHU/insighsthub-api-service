import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config/config";
import { findUserById } from "../user/user.service";

interface JwtPayload {
  userId: string;
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies[config.cookieName] as string | undefined;

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    const user = await findUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = user;

    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({ message: "Forbidden: Admins only" });
      return;
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyInternalApiKey = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (apiKey !== config.ragApiKey) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  next();
};

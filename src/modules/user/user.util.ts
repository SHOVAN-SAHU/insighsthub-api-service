import rateLimit, { Options } from "express-rate-limit";
import { config } from "../../config/config";

// Dynamic limits based on environment
const isProd = config.isProduction;

const commonOptions: Partial<Options> = {
  windowMs: 60 * 1000, // 1 minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, slow down" },

  keyGenerator: (req) => {
    const expressReq = req as Express.Request & { user?: { _id: { toString(): string } } };
    if (expressReq.user?._id) {
      return expressReq.user._id.toString();
    }

    // SAFE IP fallback (handles IPv6 properly)
    const forwarded = req.headers?.["x-forwarded-for"];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : (forwarded?.split(",")[0] ?? req.socket?.remoteAddress ?? "unknown");
    return ip;
  },
};

// 🔐 Auth limiter
export const authLimiter = rateLimit({
  ...commonOptions,
  max: isProd ? 20 : 200,
});

// 🔍 Search limiter
export const searchLimiter = rateLimit({
  ...commonOptions,
  max: isProd ? 30 : 300,
});

// ⚙️ General API limiter
export const apiLimiter = rateLimit({
  ...commonOptions,
  max: isProd ? 100 : 1000,
});

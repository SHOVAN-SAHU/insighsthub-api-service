import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { config } from "../../config/config.js";

// Dynamic limits based on environment
const isProd = config.isProduction;

const commonOptions = {
  windowMs: 60 * 1000, // 1 minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, slow down" },

  keyGenerator: (req) => {
    if (req.user?._id) {
      return req.user._id.toString();
    }

    // SAFE IP fallback (handles IPv6 properly)
    return ipKeyGenerator(req);
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
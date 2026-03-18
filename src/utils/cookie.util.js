import { config } from "../config/config.js";

export const setAuthCookie = (res, token) => {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    domain: config.isProduction ? ".insightshub.in" : undefined,
    maxAge: config.cookieMaxAge
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    domain: config.isProduction ? ".insightshub.in" : undefined
  });
}

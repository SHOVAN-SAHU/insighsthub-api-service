import { Response } from "express";
import { config } from "../../config/config";

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? "none" : "lax",
    domain: config.isProduction ? ".insightshub.in" : undefined,
    maxAge: config.cookieMaxAge,
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? "none" : "lax",
    domain: config.isProduction ? ".insightshub.in" : undefined,
  });
};

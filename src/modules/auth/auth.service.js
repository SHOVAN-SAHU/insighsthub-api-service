import { OAuth2Client } from "google-auth-library";
import { config } from "../../config/config.js";
import jwt from "jsonwebtoken";
import {
  findUserByEmail,
  findUserByGoogleId,
  createUser,
  linkGoogleAccount,
} from "../user/user.service.js";

const client = new OAuth2Client();

export const verifyGoogleToken = async (idToken) => {
  if (!idToken) {
    throw new Error("Google ID token missing");
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });

  const payload = ticket.getPayload();

  if (!payload.email_verified) {
    throw new Error("Email not verified by Google");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
};

export const handleGoogleLogin = async (idToken) => {
  const googleUser = await verifyGoogleToken(idToken);

  let user = await findUserByGoogleId(googleUser.googleId);

  if (!user) {
    user = await findUserByEmail(googleUser.email);
  }

  // Link account if needed
  if (user && !user.googleId) {
    user = await linkGoogleAccount(user, googleUser.googleId);
  }

  // Create new user
  if (!user) {
    user = await createUser({
      googleId: googleUser.googleId,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      plan: "FREE",
    });
  }

  user.toObject();

  // JWT
  const token = jwt.sign(
    { userId: user._id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return { user, token };
};
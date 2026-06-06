import { OAuth2Client } from "google-auth-library";
import { config } from "../../config/config";
import jwt from "jsonwebtoken";
import {
  findUserByEmail,
  findUserByGoogleId,
  createUser,
  linkGoogleAccount,
} from "../user/user.service";
import { IUser } from "../../types/user.types";

const client = new OAuth2Client();

interface GoogleUserPayload {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
}

export const verifyGoogleToken = async (
  idToken: string,
): Promise<GoogleUserPayload> => {
  if (!idToken) {
    throw new Error("Google ID token missing");
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Invalid Google token payload");
  }

  if (!payload.email_verified) {
    throw new Error("Email not verified by Google");
  }

  return {
    googleId: payload.sub!,
    email: payload.email!,
    name: payload.name,
    picture: payload.picture,
  };
};

export const handleGoogleLogin = async (
  idToken: string,
): Promise<{ user: Record<string, unknown>; token: string }> => {
  const googleUser = await verifyGoogleToken(idToken);

  let user: IUser | null = await findUserByGoogleId(googleUser.googleId);

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

  const userObj = user.toObject() as Record<string, unknown>;

  // JWT
  const token = jwt.sign(
    { userId: userObj._id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] },
  );

  return { user: userObj, token };
};

import User from "./user.model";
import { IUser } from "../../types/user.types";

export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return await User.findOne({ email });
};

export const findUserByGoogleId = async (
  googleId: string,
): Promise<IUser | null> => {
  return await User.findOne({ googleId });
};

export const createUser = async (
  userData: Partial<IUser>,
): Promise<IUser> => {
  return await User.create(userData);
};

export const findUserById = async (
  id: unknown,
): Promise<IUser | null> => {
  return await User.findById(id).select(
    "_id email name picture role plan currentPeriodEnd",
  );
};

export const linkGoogleAccount = async (
  user: IUser,
  googleId: string,
): Promise<IUser> => {
  user.googleId = googleId;
  return await user.save();
};

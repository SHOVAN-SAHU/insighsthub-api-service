import User from "./user.model.js";

export const findUserByEmail = async (email) => {
  return await User.findOne({ email });
};

export const findUserByGoogleId = async (googleId) => {
  return await User.findOne({ googleId });
};

export const createUser = async (userData) => {
  return await User.create(userData);
};

export const findUserById = async (id) => {
  return await User.findById(id).select("_id email name picture role plan currentPeriodEnd");
};

export const linkGoogleAccount = async (user, googleId) => {
  user.googleId = googleId;
  return await user.save();
};
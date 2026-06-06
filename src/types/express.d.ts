import { IUser } from "./user.types";

// Augment Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user: IUser;
    }
  }
}

import { handleGoogleLogin } from "./auth.service.js";
import { setAuthCookie, clearAuthCookie } from "./cookie.util.js";

export const googleLogin = async (req, res) => {
  try {
    const idToken = req.body.token || req.body.credential;

    if (!idToken) {
      return res.status(400).json({
        error: "Google token missing",
      });
    }

    const { user, token } = await handleGoogleLogin(idToken);

    setAuthCookie(res, token);

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Authentication failed" });
  }
};

export const logout = async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully" });
};

export const getCurrentUser = async (req, res) => {
  res.json({ user: req.user });
};
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import { config } from "./config/config.js";
import helmet from "helmet";
import {
  authLimiter,
  searchLimiter,
  apiLimiter,
} from "./modules/user/user.util.js";

const app = express();

const cspConfig = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],

    scriptSrc: [
      "'self'",
      // ⚠️ DEV ONLY (Vite uses eval for HMR)
      "'unsafe-eval'",
    ],

    styleSrc: [
      "'self'",
      "'unsafe-inline'", // needed for most UI libs
    ],

    imgSrc: [
      "'self'",
      "data:",
      "blob:",
      "https:",
    ],

    connectSrc: [
      "'self'",
      "http://localhost:8000",      // dev backend
      "https://api.insightshub.in", // prod backend
    ],

    fontSrc: [
      "'self'",
      "data:",
      "https:",
    ],

    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
});
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
// app.use(cspConfig);
app.use(
  cors({
    origin: ['http://localhost:5173', config.fontendUrl],
    credentials: true,
  }),
);
app.use(
  "/api/v1/subscription/webhook",
  express.raw({ type: "application/json" }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "api-service",
  });
});

app.get("/db-status", (req, res) => {
  const status = {
    0: "🔴 MongoDB Disconnected",
    1: "🟢 MongoDB Connected",
    2: "🟡 MongoDB Connecting",
    3: "🟠 MongoDB Disconnecting",
  };
  res.json({
    Status: status[mongoose.connection.readyState],
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

import authRoutes from "./modules/auth/auth.routes.js";
app.use("/api/v1/users", authLimiter, authRoutes);

import askRoutes from "./modules/ask/ask.routes.js";
app.use("/api/v1/ask", apiLimiter, askRoutes);

import documentRoutes from "./modules/document/document.routes.js";
app.use("/api/v1/documents", apiLimiter, documentRoutes);

import planRoutes from "./modules/plan/plan.route.js";
app.use("/api/v1/plans", apiLimiter, planRoutes);

import subscriptionRoutes from "./modules/subscription/subscription.route.js";
app.use("/api/v1/subscription", apiLimiter, subscriptionRoutes);

import spaceRoutes from "./modules/space/space.route.js";
app.use("/api/v1/spaces", apiLimiter, spaceRoutes);

import searchRoutes from "./modules/search/search.route.js";
app.use("/api/v1/search", searchLimiter, searchRoutes);

export default app;

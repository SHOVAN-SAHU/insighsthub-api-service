import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import { config } from "./config/config";
import helmet from "helmet";
import {
  authLimiter,
  searchLimiter,
  apiLimiter,
} from "./modules/user/user.util";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: ["http://localhost:5173", config.frontendUrl, config.frontendUrl1],
    credentials: true,
  }),
);
app.use(
  "/api/v1/subscription/webhook",
  express.raw({ type: "application/json" }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "api-service",
  });
});

app.get("/db-status", (_req, res) => {
  const status: Record<number, string> = {
    0: "🔴 MongoDB Disconnected",
    1: "🟢 MongoDB Connected",
    2: "🟡 MongoDB Connecting",
    3: "🟠 MongoDB Disconnecting",
  };
  res.json({
    Status: status[mongoose.connection.readyState],
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

import authRoutes from "./modules/auth/auth.routes";
app.use("/api/v1/users", authLimiter, authRoutes);

import askRoutes from "./modules/ask/ask.routes";
app.use("/api/v1/ask", apiLimiter, askRoutes);

import documentRoutes from "./modules/document/document.routes";
app.use("/api/v1/documents", apiLimiter, documentRoutes);

import planRoutes from "./modules/plan/plan.route";
app.use("/api/v1/plans", apiLimiter, planRoutes);

import subscriptionRoutes from "./modules/subscription/subscription.route";
app.use("/api/v1/subscription", apiLimiter, subscriptionRoutes);

import spaceRoutes from "./modules/space/space.route";
app.use("/api/v1/spaces", apiLimiter, spaceRoutes);

import searchRoutes from "./modules/search/search.route";
app.use("/api/v1/search", searchLimiter, searchRoutes);

export default app;

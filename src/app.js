import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import { config } from "./config/config.js";

const app = express();

app.use(
  cors({
    origin: config.fontendUrl,
    credentials: true,
  }),
);
app.use(
  "/api/v1/subscription/webhook",
  express.raw({ type: "application/json" })
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
app.use("/api/v1/users", authRoutes);

import askRoutes from "./modules/ask/ask.routes.js";
app.use("/api/v1/ask", askRoutes);

import documentRoutes from "./modules/document/document.routes.js";
app.use("/api/v1/documents", documentRoutes);

import planRoutes from "./modules/plan/plan.route.js";
app.use("/api/v1/plans", planRoutes);

import subscriptionRoutes from "./modules/subscription/subscription.route.js";
app.use("/api/v1/subscription", subscriptionRoutes);

import spaceRoutes from "./modules/space/space.route.js";
app.use("/api/v1/spaces", spaceRoutes);

export default app;

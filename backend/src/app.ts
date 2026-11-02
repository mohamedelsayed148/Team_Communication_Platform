import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";

import authRoutes from "./modules/auth/auth.routes";
import { authenticate } from "./middlewares/authenticate";
import { authorize } from "./middlewares/authorize";
import usersRoutes from "./modules/users/users.routes";
import teamsRoutes from "./modules/teams/teams.routes";
import tasksRoutes from "./modules/tasks/tasks.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";

import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

const allowedOrigins = ["http://localhost:5173", "http://localhost:8081"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (e.g. native mobile apps).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(pinoHttp());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Team Communication Platform API is running",
  });
});

app.use("/api/auth", authRoutes);

app.get("/api/auth/me", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authenticated successfully",
    data: {
      user: req.user,
    },
  });
});

// ADMIN only
app.get("/api/test/admin", authenticate, authorize("ADMIN"), (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome, Admin!",
  });
});

// TEAM_LEADER or ADMIN
app.get(
  "/api/test/team-management",
  authenticate,
  authorize("TEAM_LEADER", "ADMIN"),
  (_req, res) => {
    res.status(200).json({
      success: true,
      message: "You can manage teams",
    });
  },
);

// All authenticated users
app.get(
  "/api/test/member",
  authenticate,
  authorize("MEMBER", "TEAM_LEADER", "ADMIN"),
  (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome to the platform!",
    });
  },
);

app.use("/api/users", authenticate, usersRoutes);
app.use("/api/teams", authenticate, teamsRoutes);
app.use("/api/tasks", authenticate, tasksRoutes);
app.use("/api/notifications", authenticate, notificationsRoutes);

app.use(errorHandler);

export default app;

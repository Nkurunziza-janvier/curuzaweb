import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import apiRoutes from "./routes/api.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: (origin, callback) => {
    const localDevelopmentOrigin = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin ?? "");
    callback(null, !origin || origin === env.CLIENT_URL || (env.NODE_ENV !== "production" && localDevelopmentOrigin));
  },
  credentials: false,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads"), { maxAge: "1d", immutable: true }));
app.use("/api", apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

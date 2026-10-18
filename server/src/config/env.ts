import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PAYMENT_MOMO_NAME: z.string().default("e-businessRw"),
  PAYMENT_MOMO_NUMBER: z.string().default(""),
  PAYMENT_MODE: z.enum(["DEMO", "MANUAL"]).optional(),
});

export const env = envSchema.parse(process.env);
// Simulated payments must never grant paid access in a production deployment.
export const paymentMode = env.NODE_ENV === "production" ? "MANUAL" : env.PAYMENT_MODE ?? "DEMO";

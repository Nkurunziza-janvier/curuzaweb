import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export const notFoundHandler: RequestHandler = (request, _response, next) =>
  next(new AppError(404, "NOT_FOUND", `Route ${request.method} ${request.path} not found`));

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    return response.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Please check the submitted information", details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) },
    });
  }

  if (error instanceof AppError) {
    return response.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
  }

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    return response.status(tooLarge ? 413 : 400).json({ success: false, error: { code: tooLarge ? "FILE_TOO_LARGE" : "INVALID_UPLOAD", message: tooLarge ? "Uploaded file exceeds the 8 MB limit" : "File upload could not be processed" } });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ success: false, error: { code: "INVALID_JSON", message: "Request body must contain valid JSON" } });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return response.status(409).json({ success: false, error: { code: "CONFLICT", message: "A record with these details already exists" } });
    if (error.code === "P2025") return response.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Resource not found" } });
  }

  console.error(error);
  return response.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: env.NODE_ENV === "production" ? "An unexpected error occurred" : error instanceof Error ? error.message : "An unexpected error occurred" },
  });
};

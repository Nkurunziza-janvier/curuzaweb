import type { Response } from "express";

export const success = <T>(response: Response, data: T, status = 200) =>
  response.status(status).json({ success: true, data });

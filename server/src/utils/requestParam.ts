import type { Request } from "express";
import { badRequest } from "./errors.js";

export function getParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== "string" || value.length === 0) throw badRequest(`Invalid route parameter: ${name}`);
  return value;
}

export function getQuery(request: Request, name: string): string | undefined {
  const value = request.query[name];
  if (typeof value === "string") return value;
  if (value === undefined) return undefined;
  throw badRequest(`Invalid query parameter: ${name}`);
}

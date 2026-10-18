import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const validate = (schema: ZodType, source: "body" | "params" | "query" = "body"): RequestHandler =>
  (request, _response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) return next(result.error);
    if (source !== "query") request[source] = result.data;
    next();
  };

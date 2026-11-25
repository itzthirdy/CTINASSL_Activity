import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again in 15 minutes.",
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Rate limit exceeded. Please slow down and try again shortly.",
  },
});

/**
 * Recursively strips MongoDB operator keys (`$` prefixes and `.` paths) in-place
 * to prevent NoSQL operator injection without breaking Express 5 read-only getters.
 */
function sanitizeInPlace(target: unknown): void {
  if (!target || typeof target !== "object") return;

  if (Array.isArray(target)) {
    for (const item of target) {
      sanitizeInPlace(item);
    }
    return;
  }

  const record = target as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete record[key];
      continue;
    }
    sanitizeInPlace(record[key]);
  }
}

export function sanitizeMongoPayload(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  sanitizeInPlace(req.body);
  sanitizeInPlace(req.query);
  sanitizeInPlace(req.params);
  next();
}


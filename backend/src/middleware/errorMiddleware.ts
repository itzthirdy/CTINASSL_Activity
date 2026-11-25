import type { NextFunction, Request, Response } from "express";
import multer from "multer";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Uploaded shoe image exceeds the 8MB per-file limit."
        : err.message;
    res.status(400).json({ message });
    return;
  }

  if (err && typeof err === "object") {
    const errObj = err as { code?: number; name?: string; message?: string };
    if (errObj.code === 11000) {
      res.status(409).json({ message: "Duplicate record already exists." });
      return;
    }
    if (errObj.name === "ValidationError" || errObj.name === "CastError") {
      res.status(400).json({ message: errObj.message ?? "Invalid request payload." });
      return;
    }
    if (errObj.message) {
      res.status(400).json({ message: errObj.message });
      return;
    }
  }

  res.status(500).json({ message: "Internal server error." });
}


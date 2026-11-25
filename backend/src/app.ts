import path from "node:path";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import {
  apiRateLimiter,
  helmetMiddleware,
  sanitizeMongoPayload,
} from "./middleware/securityMiddleware.js";
import { SHOE_UPLOAD_DIR } from "./middleware/uploadMiddleware.js";
import crudRoutes from "./routes/crudRoutes.js";

const app = express();

app.use(helmetMiddleware);
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(sanitizeMongoPayload);
app.use("/api", apiRateLimiter);

// Serve uploaded Nike shoe images with cross-origin allowance for Canvas cutouts
app.use(
  "/uploads/shoes",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.resolve(SHOE_UPLOAD_DIR))
);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", app: "Sole Purpose API" });
});

app.use("/api", crudRoutes);
app.use(errorMiddleware);

export default app;

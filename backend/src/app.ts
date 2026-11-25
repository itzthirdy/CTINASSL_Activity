import express, { type Request, type Response } from "express";
import cors from "cors";
import crudRoutes from "./routes/crudRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", app: "Sole Purpose API" });
});

app.use("/api", crudRoutes);

export default app;

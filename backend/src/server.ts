import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { ensureSeedDatabase } from "./config/seedBootstrap.js";

const port = Number(process.env.PORT ?? 8000);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await ensureSeedDatabase();

    const server = app.listen(port, () => {
      console.log(`Sole Purpose API running on http://localhost:${port}`);
    });

    const shutdown = () => {
      server.close(() => {
        void mongoose.disconnect().finally(() => process.exit(0));
      });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start backend:", error);
    process.exit(1);
  }
}

startServer();

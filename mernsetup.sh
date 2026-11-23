#!/usr/bin/env bash
set -e

# Name of your root monorepo project
PROJECT_NAME="Sole_Purpose"

echo "Initializing Sole Purpose MERN + TypeScript + Tailwind v4 + Anime.js monorepo: $PROJECT_NAME..."

# 1. Initialize root Git repository (safe if already initialized)
if [ ! -d ".git" ]; then
  git init -b main
else
  echo "Existing .git repository detected; keeping current Git history."
fi

# 2. Setup Frontend (React + Vite + TypeScript + Tailwind CSS v4 + Anime.js)
echo "Scaffolding Sole Purpose React + TypeScript frontend..."
rm -rf frontend
npm create vite@latest frontend -- --template react-ts --no-interactive
rm -rf frontend/.git frontend/src/App.css

cd frontend
npm install
npm install axios react-router-dom lucide-react animejs tailwindcss @tailwindcss/vite clsx tailwind-merge class-variance-authority

# Create modular Sole Purpose frontend architecture
mkdir -p src/{animations,assets/shoes,components/{layout,common,home,shop,product,cart,auth,admin},context,data,hooks,pages,services,types,utils}

# Configure Vite 8 with Tailwind CSS v4 & @ alias (using import.meta.dirname)
cat << 'EOF' > vite.config.ts
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
EOF

# Configure TypeScript app config (TypeScript 7 compatible, no deprecated baseUrl)
cat << 'EOF' > tsconfig.app.json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    },

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
EOF

# Configure base Tailwind v4 stylesheet with Sole Purpose tokens
cat << 'EOF' > src/index.css
@import "tailwindcss";

@theme {
  --font-editorial: "Fraunces", Georgia, serif;
  --font-kinetic: "Barlow Condensed", system-ui, sans-serif;
  --font-sans: "Plus Jakarta Sans", "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  --color-sp-canvas: #FAF9F7;
  --color-sp-surface: #FFFFFF;
  --color-sp-pedestal: #F3F2EF;
  --color-sp-border: #E6E3DD;
  --color-sp-ink: #181715;
  --color-sp-muted: #6B6863;
  --color-sp-meta: #9A958E;
  --color-sp-taupe: #6F5D4E;
}

@layer base {
  html {
    background-color: #FAF9F7;
    color: #181715;
    font-family: var(--font-sans);
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    min-height: 100vh;
    background-color: #FAF9F7;
    color: #181715;
    overflow-x: hidden;
  }
}

.font-mono-tabular {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
EOF

# Preconfigured Axios HTTP client ready for Express + MongoDB migration
cat << 'EOF' > src/services/api.ts
import axios from "axios";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  withCredentials: true,
});

export default httpClient;
EOF

# React 19 StrictMode-safe Anime.js v4 scope helper
cat << 'EOF' > src/animations/useAnimeScope.ts
import { useEffect, useRef } from "react";
import type { DependencyList, RefObject } from "react";
import { createScope } from "animejs";
import type { Scope } from "animejs";

/**
 * React 19 StrictMode-safe hook wrapping Anime.js v4 `createScope`.
 * Automatically reverts all timelines/animations on unmount and respects
 * the user's `prefers-reduced-motion: reduce` setting.
 */
export function useAnimeScope<T extends HTMLElement = HTMLDivElement>(
  setup: (scope: Scope, root: T) => void,
  deps: DependencyList = []
): RefObject<T | null> {
  const rootRef = useRef<T | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const scope = createScope({ root }).add((self) => {
      if (self) {
        setup(self, root);
      }
    });

    return () => {
      scope.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rootRef;
}
EOF

# Clean Sole Purpose starter App.tsx (no broken ./App.css import)
cat << 'EOF' > src/App.tsx
import { animate } from "animejs";
import { useAnimeScope } from "./animations/useAnimeScope";

export function App() {
  const heroRef = useAnimeScope<HTMLDivElement>((_scope, root) => {
    const title = root.querySelector(".sp-title");
    if (title) {
      animate(title, {
        translateY: [16, 0],
        opacity: [0, 1],
        duration: 650,
        ease: "outExpo",
      });
    }
  }, []);

  return (
    <div
      ref={heroRef}
      className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9F7] px-6 text-center text-[#181715]"
    >
      <div className="sp-title max-w-xl rounded-2xl border border-[#E6E3DD] bg-white p-10 shadow-sm">
        <p className="font-mono-tabular text-xs font-semibold tracking-[0.2em] text-[#6F5D4E] uppercase">
          MERN + TypeScript + Tailwind v4 + Anime.js v4
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#181715]">
          SOLE PURPOSE
        </h1>
        <p className="mt-3 text-sm text-[#6B6863]">
          Scaffold ready. Supply your shoe models and animation cues to begin
          building the storefront and Anime.js choreography.
        </p>
      </div>
    </div>
  );
}

export default App;
EOF

# Classname helper utility
cat << 'EOF' > src/utils/cn.ts
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
EOF

cat << 'EOF' > .env
VITE_API_URL=http://localhost:8000/api
EOF

cp .env .env.example
cd ..

# 3. Setup Backend (Node.js + Express + Mongoose + TypeScript with npm)
echo "Scaffolding Sole Purpose Express + TypeScript backend..."
rm -rf backend
mkdir -p backend/src/{config,routes,controllers,services,models,middleware}
cd backend

# Initialize backend package.json
npm init -y

# Install backend dependencies and TypeScript tooling
npm install express mongoose cors dotenv
npm install -D typescript tsx @types/node @types/express @types/cors

# Update package.json for ESM + TypeScript scripts while keeping installed versions
node -e '
const fs = require("node:fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.name = "sole-purpose-backend";
pkg.private = true;
pkg.type = "module";
pkg.scripts = {
  dev: "tsx watch src/server.ts",
  build: "tsc",
  start: "node dist/server.js",
  typecheck: "tsc --noEmit"
};
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
'

# Create tsconfig.json
cat << 'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
EOF

# Create src/app.ts
cat << 'EOF' > src/app.ts
import express, { type Request, type Response } from "express";
import cors from "cors";

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

export default app;
EOF

# Create src/config/database.ts
cat << 'EOF' > src/config/database.ts
import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected (Sole Purpose)");
}
EOF

# Create src/server.ts
cat << 'EOF' > src/server.ts
import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";

const port = Number(process.env.PORT ?? 8000);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(port, () => {
      console.log(`Sole Purpose API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    process.exit(1);
  }
}

startServer();
EOF

# Create backend .env and .env.example
cat << 'EOF' > .env
PORT=8000
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/sole_purpose
EOF

cp .env .env.example

# Create backend .gitignore
cat << 'EOF' > .gitignore
node_modules/
.env
dist/
EOF

cd ..

# 4. Root Repository Configuration
cat << 'EOF' > .gitignore
node_modules/
.env
.env.local
.DS_Store
dist/
EOF

cat << 'EOF' > README.md
# Sole Purpose — MERN + TypeScript + Anime.js Monorepo

Philippine online sneaker and footwear e-commerce platform built with React, TypeScript, Tailwind CSS v4, Anime.js v4, Express, and MongoDB.

## Structure
- `frontend/`: React + Vite + TypeScript + Tailwind CSS v4 + React Router + Lucide React + Anime.js v4 + Axios
- `backend/`: Express.js + TypeScript + Mongoose (MongoDB)
- `Sole Purpose.md`: Full storefront architecture, UI/UX design tokens, catalog schema, and Anime.js choreography plan
- `Sole Purpose - Stitch Prompts.md`: Copy-paste prompt pack for Google Stitch UI design generation

## Development

### Frontend
```bash
cd frontend
npm run dev
```

### Backend
```bash
cd backend
npm run dev
```
EOF

echo "Sole Purpose MERN + Anime.js setup complete!"

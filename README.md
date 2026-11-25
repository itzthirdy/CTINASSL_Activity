# Sole Purpose — MERN + TypeScript + Anime.js E-Commerce Platform

Philippine online sneaker and footwear e-commerce web application built with **React 19, TypeScript, Vite, Tailwind CSS v4, Anime.js v4, Express 5, and MongoDB (Mongoose)**.

---

## Key Features Implemented

### Storefront & Visual Experience (`frontend/`)
- **Database-Driven 3D Hero Carousel (`HeroCylinderStage.tsx`)**: Interactive HTML5 `<canvas>` 3D cylinder carousel synced dynamically with MongoDB `featuredInHero` shoes, automatic white studio background removal (`useTransparentCutout.ts`), color-matched room gradients (`roomRgb`), dynamic ground shadows, pointer drag inertia, and autoplay controls.
- **Lateral-Only Shop Showcase (`ShopShowcase.tsx`)**: Clean catalog grid displaying each shoe's cutout **Lateral Profile** (`angles.lateral`) with 3D perspective tilt + hover lift animations (`shoeAnimations.ts`), live search, category filtering (`Basketball Shoes`, `Running Shoes`, `Sandals & Slides`, `Lifestyle`), sort options, US size filter, and in-stock filter.
- **Product Detail & Same-Model Colorways (`ProductDetailPage.tsx`)**:
  - Multi-angle viewer supporting up to 6 shoe angles (`lateral`, `pairAngle`, `medial`, `topDown`, `outsole`, `heel`).
  - **Scoped Colorway Switcher**: Displays only colorways belonging to the same shoe model (matched by `modelGroup` and self-referencing `parentProductId`).
  - **Customer Reviews CRUD**: Authenticated shoppers can submit star ratings and reviews; users can delete their own reviews (admins can moderate any).
- **Persistent Basket, Wishlist & Checkout (`BasketDrawer.tsx`, `LikedShoesDrawer.tsx`, `PaymentDashboardPage.tsx`, `UserAccountPage.tsx`, `AuthModal.tsx`)**:
  - Sign in, Register, Profile/Password edit, and 6-digit OTP Password Reset flow (`HttpOnly` JWT cookies).
  - Signed-in shopping baskets persist to MongoDB (`baskets` collection) via `/api/basket` with stock validation.
  - Atomic checkout (`POST /api/orders`) supporting `COD`, `E-Wallet`, and `Debit/Credit Card`, deducting live MongoDB stock and clearing the active basket.

### Admin Panel & Upload Studio (`AdminDashboardPage.tsx`)
- **Shoe Inventory & 3D Studio**:
  - Add, edit, and delete shoes, adjust stock levels (`-` / `+`), or load starter demo shoes (`POST /api/products/seed-demo`).
  - Upload studio photos (`multer` to `backend/uploads/shoes/`) with tunable white-background removal sensitivity (`0–100`), automatic room/accent palette extraction (`roomRgb`, `accentHex`, `glowRgb`), manual color overrides, and Anime.js entrance presets (`studio-float`, `court-bounce`, `velocity-sweep`).
  - **Multi-Colorway Workflow**: Link a new shoe directly to an existing model via **`+ Colorway`** / dropdown, or upload a **`+ Add a 2nd Colorway Version`** inline inside the Add Shoe modal.
- **Orders & Users Management**: Full RBAC-protected CRUD for customer/admin accounts and order fulfillment status (`Pending`, `Paid`, `Shipped`, `Delivered`).
- **IA Audit Logs & Schema Map Tab**: Real-time filterable audit trail (`GET /api/audit-logs`) displaying actor, action, target collection/document refs, status, IP address, and timestamp alongside a live relational map card.

---

## Database & Security Architecture (`backend/`)

### Connected 6-Collection Mongoose Schema
All foreign keys use BSON `Schema.Types.ObjectId` with Mongoose `ref` declarations:
- **`users`** (`User.ts`): User credentials (`bcryptjs` hash), RBAC role (`customer` / `admin`), OTP reset metadata, and `likedProductIds[] → products._id`.
- **`products`** (`Product.ts`): Footwear metadata, colorway grouping (`modelGroup`, `parentProductId → products._id`), studio palette/preset settings, stock, angles, and `createdBy → users._id`.
- **`baskets`** (`Basket.ts`): Persistent per-user basket (`userId → users._id`, `items[].productId → products._id`).
- **`reviews`** (`Review.ts`): Customer reviews (`productId → products._id`, `userId → users._id`).
- **`orders`** (`Order.ts`): Customer purchases (`userId → users._id`, `items[].productId → products._id`), server-calculated totals, PH shipping details, and status.
- **`audit_logs`** (`AuditLog.ts`): Information Assurance audit trail (`actorUserId → users._id`, `targetProductId → products._id`, `targetOrderId → orders._id`) logging registrations, logins/failures, logouts, OTP requests/resets, profile edits, basket syncs, and CRUD mutations.

### Information Assurance Middleware (`backend/src/middleware/`)
- **`securityMiddleware.ts`**: `helmet` security headers (`Cross-Origin-Resource-Policy: cross-origin`), rate limiters (`authRateLimiter` at 25 req/15m, `apiRateLimiter` at 300 req/15m), and recursive in-place NoSQL payload sanitization (`sanitizeMongoPayload`) stripping `$` and `.` keys.
- **`authMiddleware.ts`**: `HttpOnly` JWT cookie authentication (`requireAuth`) and Role-Based Access Control (`requireAdmin`).
- **`uploadMiddleware.ts`**: `multer.diskStorage` restricting angle uploads to `.avif`, `.png`, `.jpg`, `.jpeg`, `.webp` up to 8 MB per file with randomized filenames.
- **`errorMiddleware.ts`**: Centralized API error handling.

---

## Project Structure

```text
.
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB connection & idempotent 6-collection seedBootstrap
│   │   ├── middleware/      # Auth/RBAC, rate limits, NoSQL sanitization, Multer uploads
│   │   ├── models/          # User, Product, Basket, Review, Order, AuditLog schemas
│   │   ├── routes/          # Express 5 REST CRUD & audit routes (crudRoutes.ts)
│   │   ├── app.ts           # Express app & static /uploads/shoes serving
│   │   └── server.ts        # Database connection, bootstrap seed & graceful shutdown
│   ├── tests/               # Node/Bun API, security middleware & schema validation tests
│   └── .env.example
└── frontend/
    ├── public/shoes/        # Static starter studio shoe imagery
    ├── src/
    │   ├── animations/      # Anime.js v4 presets & 3D perspective tilt helpers
    │   ├── components/      # Hero carousel, Shop, Detail page, Cart, Checkout, Account, Admin
    │   ├── data/            # Category, angle & colorway helper definitions
    │   ├── services/        # Axios API client (with offline fallback cache)
    │   └── utils/           # Canvas white-BG cutout segmentation & palette extractor
    ├── tests/               # Catalog & colorway grouping unit tests
    └── .env.example
```

---

## How to Run Locally

### Prerequisites
- **Node.js 22+** (or **Bun** + Node)
- **MongoDB** (either a free **MongoDB Atlas** cluster URI or local MongoDB Community Server)

### 1. Backend Setup (`http://localhost:8000`)
```bash
cd backend
npm install
cp .env.example .env
```
Open `backend/.env` and set your `MONGODB_URI` (for MongoDB Atlas, include `/sole_purpose` before the query string) and `JWT_SECRET`:
```env
PORT=8000
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/sole_purpose?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
```
Start the backend server:
```bash
npm run dev
```
On first boot against an empty `sole_purpose` database, `ensureSeedDatabase()` automatically seeds starter demo users, products, colorway links, reviews, a sample basket/order, and an initial audit log entry.

### 2. Frontend Setup (`http://localhost:5173`)
Open a second terminal:
```bash
cd frontend
npm install
cp .env.example .env   # Optional: defaults to http://localhost:8000/api
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## Seeded Demo Accounts

| Role | Username | Email | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@solepurpose.ph` | `admin123` |
| **Customer** | `thirdy` | `thirdy@solepurpose.ph` | `sole123` |

---

## Available Scripts

### Backend (`cd backend`)
- `npm run dev` — Start Express API in watch mode (`tsx watch src/server.ts`)
- `npm run typecheck` — Run TypeScript typechecking (`tsc --noEmit`)
- `npm run build` — Compile TypeScript into `dist/`
- `npm run start` — Run compiled production server (`node dist/server.js`)
- `npm run test` (or `bun run test`) — Run middleware, model & API tests

### Frontend (`cd frontend`)
- `npm run dev` — Start Vite development server (`http://localhost:5173`)
- `npm run lint` — Run `oxlint`
- `npm run build` — Typecheck (`tsc -b`) and build production bundle (`vite build`)
- `npm run preview` — Preview built bundle locally
- `npm run test` (or `bun run test`) — Run catalog & colorway utility tests

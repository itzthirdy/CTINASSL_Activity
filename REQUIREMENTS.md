# Sole Purpose — Project & Course Requirements (Agile Backlog)

## 1. Professor's Core Instructions

- **Project Type**: Small-medium business enterprise web application (eCommerce & Inventory System).
- **Database & CRUD**: Must use a database with basic **CRUD** functionalities (**Create, Read, Update, Delete**).
- **Tech Stack**: **Visual Studio Code** and **Node.js**, complying with the **MERN Stack** framework (**MongoDB, Express, React, Node.js**) + **Anime.js v4**.
- **Submission Proof**: Clear screenshots of the entire desktop environment showing the completed tasks in **OpenLearning**.

---

## 2. Verified Feature Scope & Agile Sprints (All Completed)

### Sprint 1 — MERN Backend Models & Express CRUD API (`backend/src/`)
- [x] `User` model (`username`, `email`, `password`, `role: "customer" | "admin"`, `likedShoeIds`).
- [x] `Product` model (`id`, `sku`, `name`, `category`, `price`, `stock`, `sizes`, `angles`, `roomRgb`).
- [x] `Order` model (`orderNumber`, `username`, `userEmail`, `items`, `totalAmount`, `paymentMethod: "COD" | "E-Wallet" | "Debit/Credit Card"`, `shippingAddress`, `status`).
- [x] Express CRUD endpoints (`/api/auth/*`, `/api/users`, `/api/products`, `/api/orders`).

### Sprint 2 — Shoe Categories & Frontend CRUD Service (`frontend/src/data/` & `services/`)
- [x] Categories: **`All Shoes`**, **`Basketball Shoes`**, **`Running Shoes`**, **`Sandals & Slides`**, and **`Lifestyle`** (starter items ready for future Nike photos).
- [x] Stock count (`stock`) on every product.
- [x] `api.ts` service connecting to `/backend` Express CRUD routes with automatic `localStorage` database mirror so demos never fail offline.

### Sprint 3 — Auth, Forgot Password CRUD Update & Signed-In Perspective
- [x] **Register (CRUD Create)**: `Username`, `Email`, `Password`.
- [x] **Login**: **`Username` + `Password` only** (email hidden on login for security). Pre-seeded Admin (`admin` / `admin123`) and Demo Customer (`thirdy` / `sole123`).
- [x] **Forgot Password → Change Password Dashboard (CRUD Update)**: Verify registered `Email` first → unlock Change Password Dashboard to update forgotten password.
- [x] **Guest vs Signed-In Guard**: Guests cannot add to Basket or save Liked shoes (clicking prompts Sign In). Signed-in users unlock **Liked Shoes ♡** drawer, **Basket**, and **My Orders & Profile (`/account`)**.

### Sprint 4 — Nike-Style Slide-Out Category Drawer & Category Filter Tabs
- [x] **Nike-Style Slide-Out `"Shoes"` Drawer** in navbar listing `All Shoes`, `Lifestyle`, `Running`, `Basketball`, and `Sandals & Slides`.
- [x] Category filter tabs in `#shop-now` with Anime.js 1-by-1 pop-up transitions and live stock badges.

### Sprint 5 — Payment & Checkout Dashboard (`/checkout`)
- [x] Directed from `Basket` → `Checkout Now`.
- [x] **3 Payment Methods**:
  1. **Cash (COD)**: Delivery address form only.
  2. **E-Wallet**: Delivery address → confirm → displays **QR Code** (`/qr-payment.png` with built-in QR graphic fallback) → complete payment.
  3. **Debit / Credit Card**: Delivery address + card details → processes directly without QR code.
- [x] **Confirmation & Stock Deduction**: Shows receipt (`SLP-2026-XXXX`), notifies user that **they will receive a confirmation email**, and deducts purchased shoe stock.

### Sprint 6 — 3-Tab Admin Panel (`/admin`) & Verification
- [x] **Tab 1 — User Profiles CRUD**: View users, change username/email/password/role, create or delete user.
- [x] **Tab 2 — Orders & Purchases CRUD**: See who bought what, payment method, address, total, and update status or delete order.
- [x] **Tab 3 — Shoe Stock & Catalog CRUD**: See remaining stocks per shoe, update stock/price, add new shoe, or delete shoe.
- [x] Visual themes: Per-shoe colorway gradients on shoe views; white or dark obsidian with animated sporty background + Anime.js motion on dashboards.

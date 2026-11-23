# Sole Purpose — Architecture, UI/UX & Motion Implementation Plan

> Philippine Online Sneaker & Footwear Storefront (MERN-Ready Frontend + Anime.js v4)

## Overview

**Sole Purpose** is a modern, editorial-grade Philippine footwear e-commerce web application built inside `/frontend` of the MERN + TypeScript monorepo. Inspired by clean studio sneaker merchandising (`UI_UX Reference 2.pdf`) and kinetic product choreography (`Animation1.mp4`), **Sole Purpose** pairs warm minimalist gallery layouts with interactive **Anime.js v4** shoe animations that respond to colorway switches, scroll milestones, and user interactions.

The frontend operates standalone via an async `localStorage`-backed REST service layer (`frontend/src/services/api.ts`) using MongoDB-aligned document schemas (`_id`, `sku`, `colorways`, `sizes`, `reviews`, `createdAt`), while preserving a preconfigured Axios client (`VITE_API_URL`) for direct drop-in migration to the `/backend` Express + MongoDB API.

---

## Visual Direction & Design Tokens

*Inspired by `UI_UX Reference 2.pdf` (editorial streetwear storefront, studio cutout cards, minimalist bento product detail with photo reviews) and `Animation1.mp4` (bold kinetic color-curtain stage transitions) — elevated into an original Sole Purpose identity.*

### Core Storefront Palette (Warm Editorial Studio)

| Token | Hex | Purpose |
| :--- | :--- | :--- |
| `--sp-canvas` | `#FAF9F7` | Warm Alabaster primary page background |
| `--sp-surface` | `#FFFFFF` | Modals, sticky drawers, review cards, auth panels, forms |
| `--sp-pedestal` | `#F3F2EF` | Studio sneaker card boxes, bento gallery tiles, pill inputs |
| `--sp-pedestal-hover` | `#EBE9E3` | Hover pedestal lift & secondary button fill |
| `--sp-border` | `#E6E3DD` | Crisp `1px` dividers and card hairlines |
| `--sp-ink-primary` | `#181715` | Deep Espresso Charcoal headings, dark sticky price bars, primary pill CTAs |
| `--sp-ink-muted` | `#6B6863` | Descriptions, technical shoe notes, secondary labels |
| `--sp-ink-meta` | `#9A958E` | SKUs, order timestamps, size equivalents, review dates |
| `--sp-accent-taupe` | `#6F5D4E` | Editorial banner warmth, hover rings, earthy footwear accents |
| `--sp-stock-in` | `#15803D` | In Stock indicator (`> 3 pairs`) |
| `--sp-stock-low` | `#D97706` | Low Stock indicator (`1–3 pairs left`) |
| `--sp-stock-out` | `#DC2626` | Sold Out / Sale highlight badge |

### Kinetic Hero Stage Colorway Themes (Anime.js Wave Curtain)

When users cycle featured hero silhouettes (or scroll across hero showcase chapters), an Anime.js SVG wave-curtain wipes cleanly between curated studio palettes inspired by `Animation1.mp4`:
- **Sandstone Editorial**: `#6F5D4E` / `#EFECE6` with `#FAF9F7` display type
- **Midnight Indigo**: `#1E1B4B` / `#312E81` with `#F8FAFC` giant condensed type + warm amber CTA (`#F59E0B`)
- **Forest Slate**: `#1C342B` / `#2A483C` with `#FAF9F7` type + crisp stone pill CTA
- **Blush Chalk**: `#F2E4E1` / `#E5CFC9` with `#181715` bold condensed display type

### Typography System (Google Fonts)

- **Editorial Serif (`Fraunces`)**: High-craft hero headlines and collection titles (e.g., *"Silhouettes Built For Every Mile."*).
- **Kinetic Condensed Display (`Barlow Condensed` / `Anton`)**: Oversized uppercase sweeping typography positioned *behind* the floating angled hero sneaker during Anime.js showcase transitions.
- **Clean UI & Body (`Plus Jakarta Sans` / `Inter`)**: Navigation links, filter pills, product names, reviews, and checkout forms.
- **Technical Monospace (`JetBrains Mono`, `tabular-nums`)**: Every PHP `₱` price, US/EU/CM shoe size, SKU (`SLP-RUN-01`), weight/shipping tier, and Order ID (`SLP-2026-XXXX`).

### Geometry & Polish Guardrails

- Generous editorial whitespace paired with deliberate rounded studio frames (`rounded-2xl` on hero/bento lookbook media, `rounded-xl` on sneaker pedestals, `rounded-full` pill CTAs and size selectors matching Reference 2).
- Strictly grounded footwear merchandising copy (midsole foam density, outsole rubber compound, heel-to-toe drop, breathable mesh/suede uppers, true-to-size fit notes) — zero generic AI filler copy.
- Resilient `<ShoeImage />` component with styled studio silhouette fallback if an asset is still being swapped in.

---

## Anime.js v4 Choreography Architecture (`frontend/src/animations/`)

All motion is decoupled from business logic and built on **`animejs` v4** (`animate`, `createTimeline`, `stagger`, `onScroll`, `createScope`, `spring`) so we can iteratively tune every sequence as you supply your chosen shoe cutouts and models.

### Swappable Shoe Asset Contract (`src/assets/shoes/` & `src/data/shoeShowcase.ts`)

Each animated hero/showcase shoe reads from a clean configuration record so changing a shoe model or tweaking its motion never touches JSX layout code:

```ts
export interface AnimatedShoeSlot {
  id: string;
  productId: string;
  headlineWord: string;         // Giant kinetic backdrop word (e.g., "VELOCITY", "ARCHIVE", "TERRA")
  tagline: string;
  stageBgHex: string;           // Wave-curtain backdrop color
  stageTextHex: string;         // Giant typography color
  ctaBgHex: string;
  cutoutImageUrl: string;       // Transparent PNG/WebP side profile or angled cutout in src/assets/shoes/
  secondaryAngleUrl?: string;   // Optional alternate angle for hover/scroll morph
  motion: {
    restRotateDeg: number;      // e.g., -14 deg sneaker profile tilt
    floatDistancePx: number;    // Gentle vertical levitation amplitude
    floatDurationMs: number;
    entrySpringBounce: number;  // Anime.js spring bounce (0.25 - 0.45)
  };
}
```

### Planned Choreography Modules

1. **`useAnimeScope.ts`** — React 19 StrictMode-safe wrapper around `createScope({ root })` that automatically reverts timelines on unmount and honors `prefers-reduced-motion: reduce`.
2. **`heroChoreography.ts`** *(inspired by `Animation1.mp4`)*:
   - **Giant Kinetic Typography Sweep**: Oversized uppercase brand/model word slides smoothly behind the sneaker cutout with layered depth (`z-10` text behind `z-20` shoe).
   - **Floating Angled Shoe Entrance**: Spring-physics drop-in with calibrated tilt (`rotate`, `translateY`, `scale`) transitioning into a subtle continuous levitation loop + soft shadow scale synced underneath the sole.
   - **SVG Wave-Curtain Colorway Wipe**: Switching featured hero silhouettes triggers an organic wave wipe transition across the stage background while the outgoing sneaker rotates out and the incoming sneaker springs into focus.
   - **Pointer Parallax**: Subtle mouse-tracked tilt and depth offset on desktop viewports.
3. **`scrollScenes.ts`** *(inspired by `Animation1.mp4` 00:02–00:03 & Reference 2)*:
   - **Pedestal Drop Lineup**: 3–4 flagship shoes rise staggered (`stagger(90)`) onto architectural stone pedestals as the section enters viewport via `onScroll()`.
   - **Lookbook Bento & Editorial Strip**: Smooth staggered reveal of the 3-card feature row and asymmetric `"Most Recommended For You"` lookbook mosaic.
4. **`microInteractions.ts`**:
   - **Colorway Swatch Morph**: Clicking color dots on a studio sneaker card animates a crisp tilt + crossfade swap of the shoe image and updates SKU/price.
   - **Size Pill & Cart Spring**: Tactile scale pop on US/EU size selection, dark pill `Buy Now` hover arrow slide, and cart badge bounce when adding a pair.

---

## Modular Directory Structure (`frontend/src/`)

```text
frontend/src/
├── animations/
│   ├── useAnimeScope.ts         # React 19 StrictMode-safe Anime.js v4 scope hook
│   ├── heroChoreography.ts      # Floating shoe, kinetic display type, wave-curtain colorway wipe
│   ├── scrollScenes.ts          # onScroll pedestal lineup, editorial card & bento reveals
│   └── microInteractions.ts     # Swatch morphs, size-pill spring, cart badge feedback
├── assets/
│   └── shoes/                   # User-supplied transparent PNG/WebP shoe cutouts & angles
├── types/
│   └── index.ts                 # MongoDB-aligned ShoeProduct, Colorway, SizeStock, Review, Order, User
├── utils/
│   └── format.ts                # PHP (₱) formatter, US/EU/CM size helper, PH shipping & password strength
├── data/
│   ├── shoeShowcase.ts          # Tunable Anime.js hero slots & shoe model references
│   ├── seedProducts.ts          # 12–14 curated sneakers & footwear lines with colorways, sizes, reviews
│   └── seedData.ts              # Demo Customer/Admin accounts, 3 sample orders, PH shipping & SOLE10 promo
├── services/
│   └── api.ts                   # Preconfigured Axios client + async localStorage REST API
├── context/
│   ├── ToastContext.tsx         # Clean toast notifications for cart, auth & admin updates
│   ├── AuthContext.tsx          # Persistent session, role guard, Demo Mode Switcher
│   ├── StoreContext.tsx         # Live footwear catalog, inventory, reviews & orders sync
│   └── CartContext.tsx          # Pair cart items, colorway/size lock, PH freight calc, SOLE10 promo
├── components/
│   ├── layout/                  # UtilityBar, Navbar, Footer, StorefrontLayout
│   ├── common/                  # ShoeImage, StockBadge, RatingStars, ToastContainer, ProtectedAdminRoute
│   ├── home/                    # KineticHeroStage, EditorialFeatureStrip, PedestalLineup, RecommendedBento
│   ├── shop/                    # ShoeCard (with colorway dots + Add/Buy pills), SizePriceMatrix, FilterSidebar
│   ├── product/                 # BentoGallery, DarkStickyPriceBar, SizeSelector, CollapsibleSpecs, ReviewsPanel
│   ├── cart/                    # CartDrawer
│   ├── auth/                    # AuthLayout (split-screen editorial sneaker auth shell)
│   └── admin/                   # AdminSidebar, ShoeModal (colorways + US/EU size matrix), DeleteConfirmModal, OrderDetailDrawer
└── pages/
    ├── Home.tsx                 # Kinetic Hero, 3-Card Strip, Pedestal Showcase, Newly Dropped Grid, Recommended Bento, 4.9★ Reviews
    ├── ShopCatalog.tsx          # Category/Brand/Size/Colorway/Price filters, Grid View & Size-Price Matrix View
    ├── ProductDetail.tsx        # Reference 2 Wink-inspired Bento Gallery, dark Buy Now bar, US/EU sizes, photo reviews, More All You Need
    ├── Cart.tsx                 # Pair count, box shipping estimator (NCR/Luzon/Visayas/Mindanao), SOLE10 promo
    ├── Checkout.tsx             # PH Delivery Form + GCash, Maya, Card, COD interactive panels
    ├── OrderSuccess.tsx         # Printable Receipt (SLP-2026-XXXX)
    ├── MyOrders.tsx             # Customer Order History & Order ID tracker
    ├── Login.tsx                # Split-screen auth with Fill Demo Customer & Fill Demo Admin
    ├── Register.tsx             # PH Registration (+63 mobile) + live password strength meter
    ├── ForgotPassword.tsx       # 3-step Email -> 6-Digit OTP -> New Password flow
    └── AdminDashboard.tsx       # Executive KPIs, Footwear & Size Inventory CRUD, Orders, Customers
```

---

## MongoDB-Aligned Footwear Schema (`frontend/src/types/index.ts`)

```ts
export type ShoeCategory =
  | 'Lifestyle'
  | 'Running'
  | 'Court & Retro'
  | 'Trail & Outdoor'
  | 'Slip-On & Recovery'
  | 'Shoe Care';

export interface ShoeSizeStock {
  us: string;      // e.g., "US 7", "US 8", "US 9", "US 10", "US 11"
  eu: string;      // e.g., "EU 40", "EU 41", "EU 42.5"
  cm: string;      // e.g., "25.0 cm"
  sku: string;     // e.g., "SLP-VLC-WHT-09"
  stock: number;
}

export interface ShoeColorway {
  id: string;
  name: string;        // e.g., "Chalk / Mocha Gum"
  swatchHex: string;   // Primary dot hex
  accentHex?: string;  // Optional secondary split dot
  price: number;       // PHP (₱)
  compareAtPrice?: number;
  imageUrl: string;    // Studio side profile cutout
  galleryUrls: string[]; // Lifestyle, top-down, sole tread, heel detail
  sizes: ShoeSizeStock[];
}
```

---

## Planned Footwear Catalog Scope (12–14 Curated Releases in PHP ₱)

*(Placeholder starter silhouettes — ready to be swapped with your chosen shoe models and photography during our guided animation sessions.)*

| # | Model Name | Category | Colorways | Size Range | Price (PHP) |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Sole Purpose Stride 01 Low** | Lifestyle | Chalk Gum · Espresso Suede · Sage Stone | US 6 – US 12 | ₱5,490 |
| 2 | **AeroFlux Carbon Runner** | Running | Cobalt Volt · Obsidian Mist · Cloud White | US 7 – US 12 | ₱7,890 |
| 3 | **Court Archive '88 Mid** | Court & Retro | Sail Crimson · Mocha Cream · Triple Black | US 6 – US 13 | ₱6,290 |
| 4 | **TerraGrip GTX Trail** | Trail & Outdoor | Olive Bark · Slate Clay | US 7 – US 12 | ₱6,950 |
| 5 | **CloudForm Daily Trainer** | Running | Bone Sand · Midnight Navy | US 6 – US 12 | ₱5,850 |
| 6 | **Metro Gazelle Suede** | Lifestyle | Sandstone Gum · Forest Cream · Charcoal | US 5.5 – US 11.5 | ₱4,990 |
| 7 | **Apex Zoom Tempo** | Running | Electric Lime · Smoke Grey | US 7 – US 12 | ₱7,250 |
| 8 | **Canvas Heritage OX** | Court & Retro | Parchment · Washed Espresso | US 5 – US 12 | ₱3,690 |
| 9 | **Drift Molded Recovery Mule** | Slip-On & Recovery | Warm Putty · Matte Onyx | US 6 – US 12 | ₱2,490 |
| 10 | **Veloce Knit Slip-On** | Lifestyle | Heather Oat · Carbon Black | US 6 – US 11 | ₱4,290 |
| 11 | **Foam Clean & Suede Brush Kit** | Shoe Care | Essential 3-Piece Kit | One Size | ₱790 |
| 12 | **Waterproof Shield Spray + Cedar Trees** | Shoe Care | Care Bundle | S/M · L/XL | ₱1,250 |

---

## Philippine Shipping, Promo & Payment Logic

- **Box-Aware PH Shipping Calculator**:
  - **Metro Manila**: Flat `₱140` per shipment (**Free Shipping** automatically unlocked on orders `≥ ₱4,500`).
  - **Provincial Luzon**: `₱210` base + `₱45` per additional shoe box.
  - **Visayas**: `₱270` base + `₱55` per additional shoe box.
  - **Mindanao**: `₱320` base + `₱65` per additional shoe box.
- **Promo Code**: `SOLE10` applies a `10%` subtotal discount.
- **Payment Methods**: Interactive **GCash** (mobile + simulated merchant QR/ref), **Maya** (mobile + instant verification preview), **Credit/Debit Card** (formatted 16-digit input + Visa/Mastercard detection + MM/YY + CVV), and **Cash on Delivery (COD)** (COD eligibility + exact-change checkbox).
- **Live Stock Deduction**: Placing an order atomically decrements stock for the exact purchased `productId + colorwayId + size` in `localStorage`, clears the cart, generates receipt `SLP-2026-XXXX`, and syncs immediately to **My Orders** and the **Admin Dashboard**.

---

## Verification Checklist (When Implementing Frontend)

- `bash -n mernsetup.sh` passes cleanly with zero shell syntax errors.
- `npm run lint` (Oxlint) passes with zero errors in `frontend/`.
- `npm run build` (`tsc -b && vite build`) compiles cleanly with `animejs` v4 typed imports and zero TypeScript errors.
- `npm run typecheck` passes in `backend/`.
- Visual & interactive verification across desktop (`1440×900`) and mobile (`390×844`) confirming smooth Anime.js timelines (`createScope` cleanup, reduced-motion fallback), colorway/size switching, PH Checkout stock deduction, Auth/OTP reset, and Admin CRUD sync.


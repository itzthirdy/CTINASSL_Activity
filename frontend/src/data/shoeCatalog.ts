export interface ShoeAngleSet {
  lateral: string;
  outsole?: string;
  medial?: string;
  topDown?: string;
  pairAngle?: string;
  heel?: string;
}

export type AngleKey = keyof ShoeAngleSet;

export type AnimationPresetType =
  | "studio-float"
  | "court-bounce"
  | "velocity-sweep";

export const ANIMATION_PRESET_OPTIONS: {
  id: AnimationPresetType;
  label: string;
}[] = [
  { id: "studio-float", label: "Studio Float (3D Lift)" },
  { id: "court-bounce", label: "Court Bounce (Athletic Spring)" },
  { id: "velocity-sweep", label: "Velocity Sweep (Kinetic Angle)" },
];

export type ShoeCategory =
  | "All Shoes"
  | "Basketball Shoes"
  | "Running Shoes"
  | "Sandals & Slides"
  | "Lifestyle";

export const SHOE_CATEGORIES: {
  id: ShoeCategory;
  label: string;
  drawerLabel: string;
}[] = [
  { id: "All Shoes", label: "All Shoes", drawerLabel: "All Shoes" },
  { id: "Lifestyle", label: "Lifestyle", drawerLabel: "Lifestyle" },
  { id: "Running Shoes", label: "Running", drawerLabel: "Running" },
  { id: "Basketball Shoes", label: "Basketball", drawerLabel: "Basketball" },
  {
    id: "Sandals & Slides",
    label: "Sandals & Slides",
    drawerLabel: "Sandals & Slides",
  },
];

export interface AngleOption {
  key: AngleKey;
  label: string;
  shortLabel: string;
}

export const SHOE_ANGLE_OPTIONS: AngleOption[] = [
  { key: "lateral", label: "Lateral Profile", shortLabel: "Side" },
  { key: "pairAngle", label: "3/4 Dynamic Pair", shortLabel: "3/4 Pair" },
  { key: "medial", label: "Medial Profile", shortLabel: "Medial" },
  { key: "topDown", label: "Top-Down Fit", shortLabel: "Top" },
  { key: "outsole", label: "Court Traction Sole", shortLabel: "Sole" },
  { key: "heel", label: "Dual Heel Lock", shortLabel: "Heel" },
];

export interface ShoeReview {
  id: string;
  userId?: string;
  author: string;
  location: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
}

export interface FeaturedShoe {
  _id?: string;
  id: string;
  sku: string;
  modelGroup?: string;
  parentProductId?: string | null;
  badge: string;
  name: string;
  colorwayName: string;
  category: Exclude<ShoeCategory, "All Shoes">;
  price: number;
  stock: number;
  heroWord: string;
  tagline: string;
  description: string;
  accentHex: string;
  glowRgb: string;
  /** Shared studio gradient base RGB matching the Home Hero carousel */
  roomRgb: [number, number, number];
  featuredInHero?: boolean;
  animationPreset?: AnimationPresetType;
  cutoutSensitivity?: number;
  sizes: string[];
  angles: ShoeAngleSet;
  turntableSequence?: AngleKey[];
  reviews?: ShoeReview[];
}

export function deriveModelGroupKey(name: string): string {
  const cleaned = name
    .replace(/\s*'[^']*'\s*/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    cleaned ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

export function getModelColorways(
  shoe: FeaturedShoe,
  allProducts: FeaturedShoe[]
): FeaturedShoe[] {
  const shoeGroup = shoe.modelGroup?.trim() || deriveModelGroupKey(shoe.name);
  return allProducts.filter((candidate) => {
    if (candidate.id === shoe.id) return true;
    const candGroup =
      candidate.modelGroup?.trim() || deriveModelGroupKey(candidate.name);
    if (shoeGroup && candGroup === shoeGroup) return true;
    if (shoe._id && candidate.parentProductId === shoe._id) return true;
    if (candidate._id && shoe.parentProductId === candidate._id) return true;
    if (
      shoe.parentProductId &&
      candidate.parentProductId &&
      shoe.parentProductId === candidate.parentProductId
    ) {
      return true;
    }
    return false;
  });
}

export function getAvailableAngles(shoe: FeaturedShoe): AngleOption[] {
  const available = SHOE_ANGLE_OPTIONS.filter((opt) =>
    Boolean(shoe.angles?.[opt.key])
  );
  return available.length > 0 ? available : [SHOE_ANGLE_OPTIONS[0]];
}

// 12 vertical gradient stops shared across the Hero Carousel and Product Detail Page
export const ROOM_GRADIENT_STOPS: [number, number][] = [
  [0, -0.58],
  [70, -0.46],
  [120, -0.34],
  [200, -0.14],
  [248, 0.0],
  [300, 0.06],
  [380, 0.14],
  [450, 0.22],
  [530, 0.3],
  [610, 0.22],
  [700, -0.38],
  [810, -0.68],
];

export function buildShoeRoomGradientCss(rgb: [number, number, number]): string {
  const [baseR, baseG, baseB] = rgb?.length === 3 ? rgb : [52, 56, 72];
  const stops = ROOM_GRADIENT_STOPS.map(([row, amount]) => {
    let r: number;
    let g: number;
    let b: number;
    if (amount < 0) {
      const factor = 1 + amount;
      r = Math.round(baseR * factor);
      g = Math.round(baseG * factor);
      b = Math.round(baseB * factor);
    } else {
      r = Math.round(baseR + (255 - baseR) * amount);
      g = Math.round(baseG + (255 - baseG) * amount);
      b = Math.round(baseB + (255 - baseB) * amount);
    }
    const px = Math.round((row / 810) * 1000) / 10;
    return `rgb(${r}, ${g}, ${b}) ${px}%`;
  });
  return `linear-gradient(180deg, ${stops.join(", ")})`;
}

/**
 * Optional Starter Demo Shoes loaded ONLY when Admin clicks "Load Starter Demo Shoes".
 */
export const FEATURED_SHOES: FeaturedShoe[] = [
  {
    id: "ja-4-heat-check-ep",
    sku: "SLP-JA4-HC01",
    modelGroup: "ja-4-ep",
    badge: "Bestseller",
    name: "Ja 4 'Heat Check' EP",
    colorwayName: "Thermal Violet / University Gold / Obsidian",
    category: "Basketball Shoes",
    price: 7895,
    stock: 14,
    heroWord: "LUXURIOUS",
    tagline: "Explosive first-step containment with thermal-mapped court traction.",
    description:
      "Built for fearless rim attackers. Forefoot Air Zoom responsiveness pairs with an aggressive EP rubber compound engineered for high-traction indoor and outdoor Philippine courts.",
    accentHex: "#F59E0B",
    glowRgb: "168, 85, 247",
    roomRgb: [86, 35, 122],
    featuredInHero: true,
    animationPreset: "court-bounce",
    cutoutSensitivity: 50,
    sizes: ["US 7", "US 7.5", "US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 11"],
    angles: {
      lateral: "/shoes/nike1.1.avif",
      outsole: "/shoes/nike1.2.avif",
      medial: "/shoes/nike1.3.avif",
      topDown: "/shoes/nike1.4.avif",
      pairAngle: "/shoes/nike1.5.avif",
      heel: "/shoes/nike1.6.avif",
    },
    reviews: [
      {
        id: "r1",
        userId: "seed-1",
        author: "Marco D.",
        location: "Quezon City",
        rating: 5,
        title: "Unreal bite on dusty covered courts",
        comment:
          "Played three full runs in Katipunan and barely had to wipe once. The thermal purple and gold pops crazy in person.",
        date: "Nov 14, 2026",
      },
    ],
  },
  {
    id: "caitlin-1-ep-gold",
    sku: "SLP-CC1-AU22",
    modelGroup: "caitlin-1-ep",
    badge: "Promo Exclusion",
    name: "Caitlin 1 EP 'Amarillo'",
    colorwayName: "Amarillo Gold / Baltic Blue / Emerald Spark",
    category: "Basketball Shoes",
    price: 7995,
    stock: 9,
    heroWord: "PRECISION",
    tagline: "Logo-range stability and ultra-light dimensional knit control.",
    description:
      "Designed for quick-trigger pull-ups and relentless full-court pace over a dual-density Cushlon 3.0 and Zoom Air strobel platform.",
    accentHex: "#EAB308",
    glowRgb: "234, 179, 8",
    roomRgb: [120, 78, 18],
    featuredInHero: true,
    animationPreset: "studio-float",
    cutoutSensitivity: 50,
    sizes: ["US 6.5", "US 7", "US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 11"],
    angles: {
      lateral: "/shoes/nike2.1.avif",
      outsole: "/shoes/nike2.2.avif",
      medial: "/shoes/nike2.3.avif",
      topDown: "/shoes/nike2.4.avif",
      pairAngle: "/shoes/nike2.5.avif",
      heel: "/shoes/nike2.6.avif",
    },
    reviews: [
      {
        id: "r3",
        userId: "seed-2",
        author: "Bea S.",
        location: "BGC, Taguig",
        rating: 5,
        title: "Featherlight and super stable on stop-and-pop threes",
        comment:
          "Zero heel slip right out of the box and the Amarillo knit texture looks premium.",
        date: "Nov 18, 2026",
      },
    ],
  },
  {
    id: "caitlin-1-ep-royal",
    sku: "SLP-CC1-RY23",
    modelGroup: "caitlin-1-ep",
    badge: "Promo Exclusion",
    name: "Caitlin 1 EP 'Hyper Royal'",
    colorwayName: "Hyper Royal / Metallic Silver / Sunset Pulse",
    category: "Basketball Shoes",
    price: 7995,
    stock: 12,
    heroWord: "VELOCITY",
    tagline: "Deep-range court feel with multidirectional micro-herringbone bite.",
    description:
      "Finished in electric Hyper Royal dimensional weave with a sunset-tinted heel crash pad for rapid deceleration.",
    accentHex: "#3B82F6",
    glowRgb: "59, 130, 246",
    roomRgb: [5, 56, 120],
    featuredInHero: true,
    animationPreset: "velocity-sweep",
    cutoutSensitivity: 50,
    sizes: ["US 7", "US 7.5", "US 8", "US 8.5", "US 9", "US 9.5", "US 10", "US 11"],
    angles: {
      lateral: "/shoes/nike3.avif",
      outsole: "/shoes/nike3.2.avif",
      medial: "/shoes/nike3.3.avif",
      topDown: "/shoes/nike3.4.avif",
      pairAngle: "/shoes/nike3.5.avif",
      heel: "/shoes/nike3.6.avif",
    },
    reviews: [],
  },
];

export function formatPHP(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

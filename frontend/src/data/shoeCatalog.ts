export interface ShoeAngleSet {
  lateral: string;
  outsole: string;
  medial: string;
  topDown: string;
  pairAngle: string;
  heel: string;
}

export type AngleKey = keyof ShoeAngleSet;

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
  author: string;
  location: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
}

export interface FeaturedShoe {
  id: string;
  sku: string;
  badge: string;
  name: string;
  colorwayName: string;
  category: string;
  price: number;
  heroWord: string;
  tagline: string;
  description: string;
  accentHex: string;
  glowRgb: string;
  /** Shared studio gradient base RGB matching the Home Hero carousel */
  roomRgb: [number, number, number];
  sizes: string[];
  angles: ShoeAngleSet;
  turntableSequence: AngleKey[];
  reviews: ShoeReview[];
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
  const [baseR, baseG, baseB] = rgb;
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
    const pct = ((row / 810) * 100).toFixed(1);
    return `rgb(${r}, ${g}, ${b}) ${pct}%`;
  });
  return `linear-gradient(180deg, ${stops.join(", ")})`;
}

export const FEATURED_SHOES: FeaturedShoe[] = [
  {
    id: "ja-4-heat-check-ep",
    sku: "SLP-JA4-HC01",
    badge: "Bestseller",
    name: "Ja 4 'Heat Check' EP",
    colorwayName: "Thermal Violet / University Gold / Obsidian",
    category: "Basketball Shoes",
    price: 7895,
    heroWord: "LUXURIOUS",
    tagline: "Explosive first-step containment with thermal-mapped court traction.",
    description:
      "Built for fearless rim attackers. Forefoot Air Zoom responsiveness pairs with an aggressive EP rubber compound engineered for high-traction indoor and outdoor Philippine courts.",
    accentHex: "#F59E0B",
    glowRgb: "168, 85, 247",
    roomRgb: [86, 35, 122],
    sizes: [
      "US 7",
      "US 7.5",
      "US 8",
      "US 8.5",
      "US 9",
      "US 9.5",
      "US 10",
      "US 10.5",
      "US 11",
      "US 12",
    ],
    angles: {
      lateral: "/shoes/nike1.1.avif",
      outsole: "/shoes/nike1.2.avif",
      medial: "/shoes/nike1.3.avif",
      topDown: "/shoes/nike1.4.avif",
      pairAngle: "/shoes/nike1.5.avif",
      heel: "/shoes/nike1.6.avif",
    },
    turntableSequence: ["lateral", "pairAngle", "medial", "heel", "topDown", "outsole"],
    reviews: [
      {
        id: "r1",
        author: "Marco D.",
        location: "Quezon City",
        rating: 5,
        title: "Unreal bite on dusty covered courts",
        comment:
          "Played three full runs in Katipunan and barely had to wipe once. The thermal purple and gold pops crazy in person.",
        date: "Nov 14, 2026",
      },
      {
        id: "r2",
        author: "Paolo R.",
        location: "Makati",
        rating: 5,
        title: "Snug lockdown, snappy forefoot bounce",
        comment:
          "True to size EP fit with solid lateral containment on hard eurosteps.",
        date: "Nov 03, 2026",
      },
    ],
  },
  {
    id: "caitlin-1-ep-gold",
    sku: "SLP-CC1-AU22",
    badge: "Promo Exclusion",
    name: "Caitlin 1 EP",
    colorwayName: "Amarillo Gold / Baltic Blue / Emerald Spark",
    category: "Basketball Shoes",
    price: 7995,
    heroWord: "PRECISION",
    tagline: "Logo-range stability and ultra-light dimensional knit control.",
    description:
      "Designed for quick-trigger pull-ups and relentless full-court pace. The dimensional braided upper locks your foot over a dual-density Cushlon 3.0 and Zoom Air strobel platform.",
    accentHex: "#EAB308",
    glowRgb: "234, 179, 8",
    roomRgb: [120, 78, 18],
    sizes: [
      "US 6.5",
      "US 7",
      "US 7.5",
      "US 8",
      "US 8.5",
      "US 9",
      "US 9.5",
      "US 10",
      "US 11",
    ],
    angles: {
      lateral: "/shoes/nike2.1.avif",
      outsole: "/shoes/nike2.2.avif",
      medial: "/shoes/nike2.3.avif",
      topDown: "/shoes/nike2.4.avif",
      pairAngle: "/shoes/nike2.5.avif",
      heel: "/shoes/nike2.6.avif",
    },
    turntableSequence: ["lateral", "pairAngle", "medial", "heel", "topDown", "outsole"],
    reviews: [
      {
        id: "r3",
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
    badge: "Promo Exclusion",
    name: "Caitlin 1 EP",
    colorwayName: "Hyper Royal / Metallic Silver / Sunset Pulse",
    category: "Basketball Shoes",
    price: 7995,
    heroWord: "VELOCITY",
    tagline: "Deep-range court feel with multidirectional micro-herringbone bite.",
    description:
      "Finished in electric Hyper Royal dimensional weave with a sunset-tinted heel crash pad. Tuned for sharp off-ball cuts, rapid deceleration, and all-game midfoot breathability.",
    accentHex: "#3B82F6",
    glowRgb: "59, 130, 246",
    roomRgb: [5, 56, 120],
    sizes: [
      "US 6.5",
      "US 7",
      "US 7.5",
      "US 8",
      "US 8.5",
      "US 9",
      "US 9.5",
      "US 10",
      "US 11",
    ],
    angles: {
      lateral: "/shoes/nike3.avif",
      outsole: "/shoes/nike3.2.avif",
      medial: "/shoes/nike3.3.avif",
      topDown: "/shoes/nike3.4.avif",
      pairAngle: "/shoes/nike3.5.avif",
      heel: "/shoes/nike3.6.avif",
    },
    turntableSequence: ["lateral", "pairAngle", "medial", "heel", "topDown", "outsole"],
    reviews: [
      {
        id: "r4",
        author: "Kenji T.",
        location: "Cebu City",
        rating: 5,
        title: "Hyper Royal colorway turns heads immediately",
        comment:
          "EP outsole holds up great on outdoor concrete courts and cushions hard landings.",
        date: "Nov 10, 2026",
      },
    ],
  },
];

export function formatPHP(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

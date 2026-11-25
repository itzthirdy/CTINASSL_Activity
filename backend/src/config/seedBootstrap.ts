import bcrypt from "bcryptjs";
import { UserModel } from "../models/User.js";

export const STARTER_DEMO_SHOES = [
  {
    id: "ja-4-heat-check-ep",
    sku: "SLP-JA4-HC01",
    badge: "Bestseller",
    name: "Ja 4 'Heat Check' EP",
    colorwayName: "Thermal Violet / University Gold / Obsidian",
    category: "Basketball Shoes" as const,
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
    animationPreset: "court-bounce" as const,
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
    badge: "Promo Exclusion",
    name: "Caitlin 1 EP 'Amarillo'",
    colorwayName: "Amarillo Gold / Baltic Blue / Emerald Spark",
    category: "Basketball Shoes" as const,
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
    animationPreset: "studio-float" as const,
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
        id: "r2",
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
    badge: "Promo Exclusion",
    name: "Caitlin 1 EP 'Hyper Royal'",
    colorwayName: "Hyper Royal / Metallic Silver / Sunset Pulse",
    category: "Basketball Shoes" as const,
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
    animationPreset: "velocity-sweep" as const,
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

export async function ensureSeedUsers(): Promise<void> {
  const existingCount = await UserModel.countDocuments();
  if (existingCount > 0) return;

  const [adminPassword, customerPassword] = await Promise.all([
    bcrypt.hash("admin123", 10),
    bcrypt.hash("sole123", 10),
  ]);

  await UserModel.create([
    {
      username: "admin",
      email: "admin@solepurpose.ph",
      password: adminPassword,
      role: "admin",
      likedShoeIds: [],
    },
    {
      username: "thirdy",
      email: "thirdy@solepurpose.ph",
      password: customerPassword,
      role: "customer",
      likedShoeIds: [],
    },
  ]);

  console.log("Seeded default Sole Purpose admin & customer users (bcrypt hashed).");
}


import bcrypt from "bcryptjs";
import { AuditLogModel } from "../models/AuditLog.js";
import { BasketModel } from "../models/Basket.js";
import { OrderModel } from "../models/Order.js";
import { ProductModel } from "../models/Product.js";
import { ReviewModel } from "../models/Review.js";
import { UserModel } from "../models/User.js";

export const STARTER_DEMO_SHOES = [
  {
    id: "ja-4-heat-check-ep",
    sku: "SLP-JA4-HC01",
    modelGroup: "ja-4-ep",
    badge: "Bestseller",
    name: "Ja 4 'Heat Check' EP",
    colorwayName: "Thermal Violet / University Gold / Obsidian",
    category: "Basketball Shoes" as const,
    price: 7895,
    stock: 14,
    heroWord: "LUXURIOUS",
    tagline:
      "Explosive first-step containment with thermal-mapped court traction.",
    description:
      "Built for fearless rim attackers. Forefoot Air Zoom responsiveness pairs with an aggressive EP rubber compound engineered for high-traction indoor and outdoor Philippine courts.",
    accentHex: "#F59E0B",
    glowRgb: "168, 85, 247",
    roomRgb: [86, 35, 122],
    featuredInHero: true,
    animationPreset: "court-bounce" as const,
    cutoutSensitivity: 50,
    sizes: [
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
      lateral: "/shoes/nike1.1.avif",
      outsole: "/shoes/nike1.2.avif",
      medial: "/shoes/nike1.3.avif",
      topDown: "/shoes/nike1.4.avif",
      pairAngle: "/shoes/nike1.5.avif",
      heel: "/shoes/nike1.6.avif",
    },
  },
  {
    id: "caitlin-1-ep-gold",
    sku: "SLP-CC1-AU22",
    modelGroup: "caitlin-1-ep",
    badge: "Promo Exclusion",
    name: "Caitlin 1 EP 'Amarillo'",
    colorwayName: "Amarillo Gold / Baltic Blue / Emerald Spark",
    category: "Basketball Shoes" as const,
    price: 7995,
    stock: 9,
    heroWord: "PRECISION",
    tagline:
      "Logo-range stability and ultra-light dimensional knit control.",
    description:
      "Designed for quick-trigger pull-ups and relentless full-court pace over a dual-density Cushlon 3.0 and Zoom Air strobel platform.",
    accentHex: "#EAB308",
    glowRgb: "234, 179, 8",
    roomRgb: [120, 78, 18],
    featuredInHero: true,
    animationPreset: "studio-float" as const,
    cutoutSensitivity: 50,
    sizes: [
      "US 6.5",
      "US 7",
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
  },
  {
    id: "caitlin-1-ep-royal",
    sku: "SLP-CC1-RY23",
    modelGroup: "caitlin-1-ep",
    badge: "Promo Exclusion",
    name: "Caitlin 1 EP 'Hyper Royal'",
    colorwayName: "Hyper Royal / Metallic Silver / Sunset Pulse",
    category: "Basketball Shoes" as const,
    price: 7995,
    stock: 12,
    heroWord: "VELOCITY",
    tagline:
      "Deep-range court feel with multidirectional micro-herringbone bite.",
    description:
      "Finished in electric Hyper Royal dimensional weave with a sunset-tinted heel crash pad for rapid deceleration.",
    accentHex: "#3B82F6",
    glowRgb: "59, 130, 246",
    roomRgb: [5, 56, 120],
    featuredInHero: true,
    animationPreset: "velocity-sweep" as const,
    cutoutSensitivity: 50,
    sizes: [
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
  },
];

export const STARTER_SHOE_REVIEWS: Record<
  string,
  {
    author: string;
    location: string;
    rating: number;
    title: string;
    comment: string;
    date: string;
  }[]
> = {
  "ja-4-heat-check-ep": [
    {
      author: "Marco D.",
      location: "Quezon City",
      rating: 5,
      title: "Unreal bite on dusty covered courts",
      comment:
        "Played three full runs in Katipunan and barely had to wipe once. The thermal purple and gold pops crazy in person.",
      date: "Nov 14, 2026",
    },
  ],
  "caitlin-1-ep-gold": [
    {
      author: "Bea S.",
      location: "BGC, Taguig",
      rating: 5,
      title: "Featherlight and super stable on stop-and-pop threes",
      comment:
        "Zero heel slip right out of the box and the Amarillo knit texture looks premium.",
      date: "Nov 18, 2026",
    },
  ],
};

/**
 * Seeds all 6 connected collections (users, products, reviews, baskets, orders,
 * audit_logs) idempotently on server boot so every Mongoose ObjectId relationship
 * is immediately visible and queryable in MongoDB Atlas Data Modeling.
 */
export async function ensureSeedDatabase(): Promise<void> {
  // 1. Ensure default admin + customer users exist
  let adminUser = await UserModel.findOne({ role: "admin" });
  let customerUser = await UserModel.findOne({ role: "customer" });

  if ((await UserModel.countDocuments()) === 0) {
    const [adminPassword, customerPassword] = await Promise.all([
      bcrypt.hash("admin123", 10),
      bcrypt.hash("sole123", 10),
    ]);

    const createdUsers = await UserModel.create([
      {
        username: "admin",
        email: "admin@solepurpose.ph",
        password: adminPassword,
        role: "admin",
        likedProductIds: [],
      },
      {
        username: "thirdy",
        email: "thirdy@solepurpose.ph",
        password: customerPassword,
        role: "customer",
        likedProductIds: [],
      },
    ]);
    adminUser = createdUsers[0];
    customerUser = createdUsers[1];
    console.log(
      "Seeded default Sole Purpose admin & customer users (bcrypt hashed)."
    );
  }

  // 2. Ensure starter catalog products exist with `createdBy` -> User._id
  let seededProducts = await ProductModel.find().sort({ createdAt: 1 });
  if (seededProducts.length === 0) {
    seededProducts = await ProductModel.create(
      STARTER_DEMO_SHOES.map((shoe) => ({
        ...shoe,
        createdBy: adminUser?._id ?? null,
      }))
    );
    console.log(
      `Seeded ${seededProducts.length} starter products linked to admin user.`
    );
  }

  // Idempotently ensure starter modelGroup & parentProductId colorway links exist
  const starterGroupById = new Map(
    STARTER_DEMO_SHOES.map((s) => [s.id, s.modelGroup])
  );
  for (const prod of seededProducts) {
    const starterGroup = starterGroupById.get(prod.id);
    if (starterGroup && !prod.modelGroup) {
      prod.modelGroup = starterGroup;
      await prod.save();
    }
  }
  const caitlinGold = seededProducts.find((p) => p.id === "caitlin-1-ep-gold");
  const caitlinRoyal = seededProducts.find((p) => p.id === "caitlin-1-ep-royal");
  if (caitlinGold && caitlinRoyal && !caitlinRoyal.parentProductId) {
    caitlinRoyal.parentProductId = caitlinGold._id;
    caitlinRoyal.modelGroup = caitlinGold.modelGroup || "caitlin-1-ep";
    await caitlinRoyal.save();
  }

  const primaryProduct = seededProducts[0];
  const secondaryProduct = seededProducts[1] ?? seededProducts[0];

  // 3. Link customer wishlist ObjectId ref so users.likedProductIds has concrete ObjectId items
  if (
    customerUser &&
    primaryProduct &&
    (customerUser.likedProductIds?.length ?? 0) === 0
  ) {
    customerUser.likedProductIds = [primaryProduct._id];
    await customerUser.save();
  }

  // 4. Ensure normalized Reviews collection has linked reviews (productId + userId)
  if ((await ReviewModel.countDocuments()) === 0 && customerUser) {
    const reviewDocs = [];
    for (const prod of seededProducts) {
      const starterList = STARTER_SHOE_REVIEWS[prod.id] ?? [];
      for (const rev of starterList) {
        reviewDocs.push({
          productId: prod._id,
          userId: customerUser._id,
          author: rev.author,
          location: rev.location,
          rating: rev.rating,
          title: rev.title,
          comment: rev.comment,
          date: rev.date,
        });
      }
    }
    if (reviewDocs.length > 0) {
      await ReviewModel.create(reviewDocs);
    }
  }

  // 5. Ensure sample Basket exists (userId -> User._id, items[].productId -> Product._id)
  if (
    (await BasketModel.countDocuments()) === 0 &&
    customerUser &&
    secondaryProduct
  ) {
    await BasketModel.create({
      userId: customerUser._id,
      items: [
        {
          productId: secondaryProduct._id,
          shoeId: secondaryProduct.id,
          size: "US 9",
          quantity: 1,
        },
      ],
    });
  }

  // 6. Ensure sample historical Order exists (userId -> User._id, items[].productId -> Product._id)
  let seedOrder = await OrderModel.findOne();
  if (!seedOrder && customerUser && primaryProduct) {
    seedOrder = await OrderModel.create({
      orderNumber: "SLP-2026-1001",
      userId: customerUser._id,
      username: customerUser.username,
      userEmail: customerUser.email,
      items: [
        {
          productId: primaryProduct._id,
          shoeId: primaryProduct.id,
          shoeName: primaryProduct.name,
          size: "US 9",
          quantity: 1,
          price: primaryProduct.price,
          imageUrl: primaryProduct.angles.lateral,
        },
      ],
      totalAmount: primaryProduct.price,
      paymentMethod: "E-Wallet",
      shippingAddress: {
        fullName: "Thirdy Customer",
        phone: "+63 917 000 1001",
        street: "88 Katipunan Ave",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1108",
      },
      status: "Delivered",
    });
  }

  // 7. Ensure AuditLog collection has linked bootstrap record
  if ((await AuditLogModel.countDocuments()) === 0 && adminUser) {
    await AuditLogModel.create({
      actorUserId: adminUser._id,
      actorUsername: adminUser.username,
      action: "SYSTEM_BOOTSTRAP",
      targetCollection: "system",
      targetProductId: primaryProduct?._id ?? null,
      targetOrderId: seedOrder?._id ?? null,
      status: "SUCCESS",
      details:
        "Initialized 6 connected Mongoose collections (users, products, baskets, reviews, orders, audit_logs).",
      ipAddress: "127.0.0.1",
    });
  }
}

import mongoose, { Schema, type Document } from "mongoose";

export type AnimationPresetType =
  | "studio-float"
  | "court-bounce"
  | "velocity-sweep";

export interface IProductReview {
  id: string;
  userId: string;
  author: string;
  location: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
}

export interface IProduct extends Document {
  id: string;
  sku: string;
  badge: string;
  name: string;
  colorwayName: string;
  category:
    | "Basketball Shoes"
    | "Running Shoes"
    | "Sandals & Slides"
    | "Lifestyle";
  price: number;
  stock: number;
  heroWord: string;
  tagline: string;
  description: string;
  accentHex: string;
  glowRgb: string;
  roomRgb: [number, number, number];
  featuredInHero: boolean;
  animationPreset: AnimationPresetType;
  cutoutSensitivity: number;
  sizes: string[];
  angles: {
    lateral: string;
    outsole: string;
    medial: string;
    topDown: string;
    pairAngle: string;
    heel: string;
  };
  reviews: IProductReview[];
}

const ProductReviewSchema = new Schema<IProductReview>(
  {
    id: { type: String, required: true },
    userId: { type: String, required: true },
    author: { type: String, required: true },
    location: { type: String, default: "Philippines" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true },
    comment: { type: String, required: true },
    date: { type: String, required: true },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true, unique: true },
    sku: { type: String, required: true },
    badge: { type: String, default: "New Release" },
    name: { type: String, required: true },
    colorwayName: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "Basketball Shoes",
        "Running Shoes",
        "Sandals & Slides",
        "Lifestyle",
      ],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 10, min: 0 },
    heroWord: { type: String, default: "VELOCITY" },
    tagline: {
      type: String,
      default: "Engineered studio footwear curated for Sole Purpose Philippines.",
    },
    description: { type: String, default: "" },
    accentHex: { type: String, default: "#F59E0B" },
    glowRgb: { type: String, default: "245, 158, 11" },
    roomRgb: { type: [Number], default: [86, 35, 122] },
    featuredInHero: { type: Boolean, default: false },
    animationPreset: {
      type: String,
      enum: ["studio-float", "court-bounce", "velocity-sweep"],
      default: "studio-float",
    },
    cutoutSensitivity: { type: Number, default: 50, min: 0, max: 100 },
    sizes: {
      type: [String],
      default: ["US 7", "US 8", "US 9", "US 10", "US 11"],
    },
    angles: {
      lateral: { type: String, required: true },
      outsole: { type: String, default: "" },
      medial: { type: String, default: "" },
      topDown: { type: String, default: "" },
      pairAngle: { type: String, default: "" },
      heel: { type: String, default: "" },
    },
    reviews: { type: [ProductReviewSchema], default: [] },
  },
  { timestamps: true }
);

export const ProductModel =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

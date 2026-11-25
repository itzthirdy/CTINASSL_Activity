import mongoose, { Schema, type Document } from "mongoose";

export interface IProduct extends Document {
  id: string;
  sku: string;
  badge: string;
  name: string;
  colorwayName: string;
  category: "Basketball Shoes" | "Running Shoes" | "Sandals & Slides" | "Lifestyle";
  price: number;
  stock: number;
  description: string;
  accentHex: string;
  glowRgb: string;
  roomRgb: [number, number, number];
  sizes: string[];
  angles: {
    lateral: string;
    outsole: string;
    medial: string;
    topDown: string;
    pairAngle: string;
    heel: string;
  };
}

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true, unique: true },
    sku: { type: String, required: true },
    badge: { type: String, default: "Featured" },
    name: { type: String, required: true },
    colorwayName: { type: String, required: true },
    category: {
      type: String,
      enum: ["Basketball Shoes", "Running Shoes", "Sandals & Slides", "Lifestyle"],
      required: true,
    },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 10 },
    description: { type: String, default: "" },
    accentHex: { type: String, default: "#F59E0B" },
    glowRgb: { type: String, default: "168, 85, 247" },
    roomRgb: { type: [Number], default: [86, 35, 122] },
    sizes: { type: [String], default: ["US 8", "US 9", "US 10", "US 11"] },
    angles: {
      lateral: { type: String, required: true },
      outsole: { type: String, required: true },
      medial: { type: String, required: true },
      topDown: { type: String, required: true },
      pairAngle: { type: String, required: true },
      heel: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export const ProductModel =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IReview extends Document {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  author: string;
  location: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    author: { type: String, required: true },
    location: { type: String, default: "Philippines" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true },
    comment: { type: String, required: true },
    date: { type: String, required: true },
  },
  { timestamps: true }
);

export const ReviewModel =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);


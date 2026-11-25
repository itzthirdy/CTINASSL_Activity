import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IBasketItem {
  productId: Types.ObjectId;
  shoeId: string;
  size: string;
  quantity: number;
}

export interface IBasket extends Document {
  userId: Types.ObjectId;
  items: IBasketItem[];
  createdAt: Date;
  updatedAt: Date;
}

const BasketItemSchema = new Schema<IBasketItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    shoeId: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const BasketSchema = new Schema<IBasket>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: { type: [BasketItemSchema], default: [] },
  },
  { timestamps: true }
);

export const BasketModel =
  mongoose.models.Basket || mongoose.model<IBasket>("Basket", BasketSchema);


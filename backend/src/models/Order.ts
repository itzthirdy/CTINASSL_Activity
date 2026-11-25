import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IOrderItem {
  productId: Types.ObjectId;
  shoeId: string;
  shoeName: string;
  size: string;
  quantity: number;
  price: number;
  imageUrl: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId: Types.ObjectId;
  username: string;
  userEmail: string;
  items: IOrderItem[];
  totalAmount: number;
  paymentMethod: "COD" | "E-Wallet" | "Debit/Credit Card";
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  status: "Pending" | "Paid" | "Shipped" | "Delivered";
  createdAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    username: { type: String, required: true },
    userEmail: { type: String, required: true },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        shoeId: { type: String, required: true },
        shoeName: { type: String, required: true },
        size: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        imageUrl: { type: String, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["COD", "E-Wallet", "Debit/Credit Card"],
      required: true,
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      province: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Shipped", "Delivered"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export const OrderModel =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

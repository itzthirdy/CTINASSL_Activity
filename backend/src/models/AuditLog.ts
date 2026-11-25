import mongoose, { Schema, type Document, type Types } from "mongoose";

export type AuditTargetCollection =
  | "users"
  | "products"
  | "baskets"
  | "reviews"
  | "orders"
  | "system";

export interface IAuditLog extends Document {
  actorUserId?: Types.ObjectId | null;
  actorUsername: string;
  action: string;
  targetCollection: AuditTargetCollection;
  targetProductId?: Types.ObjectId | null;
  targetOrderId?: Types.ObjectId | null;
  status: "SUCCESS" | "FAILURE";
  details: string;
  ipAddress: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorUsername: { type: String, default: "anonymous" },
    action: { type: String, required: true, index: true },
    targetCollection: {
      type: String,
      enum: ["users", "products", "baskets", "reviews", "orders", "system"],
      required: true,
    },
    targetProductId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    targetOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE"],
      default: "SUCCESS",
    },
    details: { type: String, default: "" },
    ipAddress: { type: String, default: "127.0.0.1" },
  },
  { timestamps: true }
);

export const AuditLogModel =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);


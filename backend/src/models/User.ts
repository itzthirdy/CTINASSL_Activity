import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "customer" | "admin";
  likedProductIds: (Types.ObjectId | { _id: Types.ObjectId; id?: string })[];
  resetOtpHash?: string;
  resetOtpExpiresAt?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    likedProductIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
    resetOtpHash: { type: String, default: undefined },
    resetOtpExpiresAt: { type: Date, default: undefined },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.resetOtpHash;
        delete ret.resetOtpExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export interface SerializedUser {
  _id: string;
  username: string;
  email: string;
  role: "customer" | "admin";
  likedProductIds: string[];
  likedShoeIds: string[];
  createdAt: string;
}

/**
 * Normalizes a Mongoose user document (optionally populated with likedProductIds)
 * into a safe public response while keeping backward-compatible `likedShoeIds` slugs.
 */
export function serializeUser(user: IUser): SerializedUser {
  const likedProductIds: string[] = [];
  const likedShoeIds: string[] = [];

  for (const entry of user.likedProductIds ?? []) {
    if (entry && typeof entry === "object" && "_id" in entry) {
      likedProductIds.push(String(entry._id));
      if ("id" in entry && typeof entry.id === "string" && entry.id) {
        likedShoeIds.push(entry.id);
      } else {
        likedShoeIds.push(String(entry._id));
      }
    } else if (entry) {
      likedProductIds.push(String(entry));
    }
  }

  return {
    _id: String(user._id),
    username: user.username,
    email: user.email,
    role: user.role,
    likedProductIds,
    likedShoeIds,
    createdAt: user.createdAt
      ? new Date(user.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

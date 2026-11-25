import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "customer" | "admin";
  likedShoeIds: string[];
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
    likedShoeIds: { type: [String], default: [] },
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

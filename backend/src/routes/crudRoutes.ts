import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import mongoose, { type Types } from "mongoose";
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  requireAdmin,
  requireAuth,
  setAuthCookie,
  signAuthToken,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import { authRateLimiter } from "../middleware/securityMiddleware.js";
import { uploadShoeAngles } from "../middleware/uploadMiddleware.js";
import {
  STARTER_DEMO_SHOES,
  STARTER_SHOE_REVIEWS,
} from "../config/seedBootstrap.js";
import {
  AuditLogModel,
  type AuditTargetCollection,
} from "../models/AuditLog.js";
import { BasketModel } from "../models/Basket.js";
import { OrderModel } from "../models/Order.js";
import { ProductModel, type IProduct } from "../models/Product.js";
import { ReviewModel } from "../models/Review.js";
import {
  serializeUser,
  UserModel,
  type IUser,
  type SerializedUser,
} from "../models/User.js";

const router = Router();

// --- HELPERS ---

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) {
    return fwd.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

async function recordAudit(entry: {
  actorUserId?: Types.ObjectId | string | null;
  actorUsername?: string;
  action: string;
  targetCollection: AuditTargetCollection;
  targetProductId?: Types.ObjectId | string | null;
  targetOrderId?: Types.ObjectId | string | null;
  status?: "SUCCESS" | "FAILURE";
  details?: string;
  req?: Request;
}): Promise<void> {
  try {
    await AuditLogModel.create({
      actorUserId: entry.actorUserId ?? null,
      actorUsername: entry.actorUsername ?? "anonymous",
      action: entry.action,
      targetCollection: entry.targetCollection,
      targetProductId: entry.targetProductId ?? null,
      targetOrderId: entry.targetOrderId ?? null,
      status: entry.status ?? "SUCCESS",
      details: entry.details ?? "",
      ipAddress: entry.req ? getClientIp(entry.req) : "127.0.0.1",
    });
  } catch (err) {
    console.warn("Audit log write skipped:", err);
  }
}

async function toClientUser(user: IUser): Promise<SerializedUser> {
  await user.populate("likedProductIds", "id");
  return serializeUser(user);
}

async function resolveLikedProductObjectIds(
  likedShoeIds: unknown[]
): Promise<Types.ObjectId[]> {
  const slugs = likedShoeIds.map(String).filter(Boolean);
  if (slugs.length === 0) return [];
  const matching = await ProductModel.find({ id: { $in: slugs } }).select("_id");
  return matching.map((p) => p._id);
}

interface HydratedReview {
  id: string;
  userId: string;
  author: string;
  location: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
}

function deriveModelGroup(name: string): string {
  const cleaned = name
    .replace(/\s*'[^']*'\s*/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    cleaned ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

async function attachProductReviews(products: IProduct[]) {
  if (products.length === 0) return [];
  const productIds = products.map((p) => p._id);
  const allReviews = await ReviewModel.find({
    productId: { $in: productIds },
  }).sort({ createdAt: -1 });

  const grouped = new Map<string, HydratedReview[]>();
  for (const r of allReviews) {
    const key = String(r.productId);
    const list = grouped.get(key) ?? [];
    list.push({
      id: String(r._id),
      userId: String(r.userId),
      author: r.author,
      location: r.location,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      date: r.date,
    });
    grouped.set(key, list);
  }

  return products.map((p) => {
    const plain = p.toObject();
    return {
      ...plain,
      modelGroup: p.modelGroup || deriveModelGroup(p.name),
      parentProductId: p.parentProductId ? String(p.parentProductId) : null,
      createdBy: p.createdBy ? String(p.createdBy) : null,
      reviews: grouped.get(String(p._id)) ?? [],
    };
  });
}

interface PopulatedBasketEntry {
  productId?: IProduct | Types.ObjectId | null;
  shoeId: string;
  size: string;
  quantity: number;
}

async function getHydratedBasketForUser(userId: Types.ObjectId) {
  const basket = await BasketModel.findOne({ userId }).populate(
    "items.productId"
  );
  if (!basket) return [];

  const rawItems = (basket.items ?? []) as PopulatedBasketEntry[];
  const validEntries = rawItems.filter(
    (item): item is PopulatedBasketEntry & { productId: IProduct } =>
      item.productId !== null &&
      item.productId !== undefined &&
      typeof item.productId === "object" &&
      "name" in item.productId
  );
  const productDocs = validEntries.map((item) => item.productId);
  const hydratedProducts = await attachProductReviews(productDocs);
  const byId = new Map(hydratedProducts.map((p) => [String(p._id), p]));

  return validEntries
    .map((item) => {
      const shoe = byId.get(String(item.productId._id));
      if (!shoe) return null;
      return {
        shoe,
        size: item.size,
        quantity: item.quantity,
      };
    })
    .filter(Boolean);
}

// --- AUTH & 6-DIGIT OTP FORGOT PASSWORD ---

router.get(
  "/auth/me",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    res.json(await toClientUser(req.authUser!));
  }
);

router.post(
  "/auth/register",
  authRateLimiter,
  async (req: Request, res: Response) => {
    const username = String(req.body?.username ?? "").trim();
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");

    if (username.length < 3 || !email.includes("@") || password.length < 6) {
      await recordAudit({
        actorUsername: username || "anonymous",
        action: "AUTH_REGISTER",
        targetCollection: "users",
        status: "FAILURE",
        details: "Validation failed during customer registration.",
        req,
      });
      res.status(400).json({
        message:
          "Username (min 3 chars), valid email, and password (min 6 chars) are required.",
      });
      return;
    }

    const existing = await UserModel.findOne({
      $or: [{ username }, { email }],
    });
    if (existing) {
      await recordAudit({
        actorUserId: existing._id,
        actorUsername: username,
        action: "AUTH_REGISTER",
        targetCollection: "users",
        status: "FAILURE",
        details: `Duplicate registration attempt for @${username} / ${email}.`,
        req,
      });
      res.status(409).json({ message: "Username or email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      username,
      email,
      password: passwordHash,
      role: "customer",
      likedProductIds: [],
    });

    await recordAudit({
      actorUserId: user._id,
      actorUsername: user.username,
      action: "AUTH_REGISTER",
      targetCollection: "users",
      status: "SUCCESS",
      details: `Registered new customer account @${user.username}.`,
      req,
    });

    const token = signAuthToken(user);
    setAuthCookie(res, token);
    res.status(201).json(await toClientUser(user));
  }
);

router.post(
  "/auth/login",
  authRateLimiter,
  async (req: Request, res: Response) => {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");

    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required." });
      return;
    }

    const user = await UserModel.findOne({ username });
    if (!user) {
      await recordAudit({
        actorUsername: username,
        action: "AUTH_LOGIN_FAILED",
        targetCollection: "users",
        status: "FAILURE",
        details: `Failed sign-in attempt for unknown username @${username}.`,
        req,
      });
      res.status(401).json({ message: "Invalid username or password." });
      return;
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      await recordAudit({
        actorUserId: user._id,
        actorUsername: user.username,
        action: "AUTH_LOGIN_FAILED",
        targetCollection: "users",
        status: "FAILURE",
        details: `Incorrect password submitted for @${user.username}.`,
        req,
      });
      res.status(401).json({ message: "Invalid username or password." });
      return;
    }

    await recordAudit({
      actorUserId: user._id,
      actorUsername: user.username,
      action: "AUTH_LOGIN_SUCCESS",
      targetCollection: "users",
      status: "SUCCESS",
      details: `Authenticated ${user.role} session issued via HttpOnly JWT cookie.`,
      req,
    });

    const token = signAuthToken(user);
    setAuthCookie(res, token);
    res.json(await toClientUser(user));
  }
);

router.post("/auth/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  let actorUserId: string | null = null;
  let actorUsername = "anonymous";
  if (typeof token === "string" && token) {
    try {
      const secret =
        process.env.JWT_SECRET ?? "sole_purpose_dev_jwt_secret_change_in_prod";
      const decoded = jwt.verify(token, secret) as { sub?: string };
      if (decoded?.sub) {
        const found = await UserModel.findById(decoded.sub).select("username");
        if (found) {
          actorUserId = String(found._id);
          actorUsername = found.username;
        }
      }
    } catch {
      // Expired or invalid token during logout
    }
  }

  await recordAudit({
    actorUserId,
    actorUsername,
    action: "AUTH_LOGOUT",
    targetCollection: "users",
    status: "SUCCESS",
    details: `Session cookie cleared for @${actorUsername}.`,
    req,
  });

  clearAuthCookie(res);
  res.json({ ok: true });
});

router.post(
  "/auth/verify-email",
  authRateLimiter,
  async (req: Request, res: Response) => {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const user = await UserModel.findOne({ email });
    if (!user) {
      await recordAudit({
        actorUsername: email || "anonymous",
        action: "AUTH_OTP_REQUEST",
        targetCollection: "users",
        status: "FAILURE",
        details: `OTP requested for unrecognized email ${email}.`,
        req,
      });
      res
        .status(404)
        .json({ message: "No account found with that email address." });
      return;
    }

    const otp = String(crypto.randomInt(100000, 999999));
    user.resetOtpHash = await bcrypt.hash(otp, 8);
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await recordAudit({
      actorUserId: user._id,
      actorUsername: user.username,
      action: "AUTH_OTP_REQUEST",
      targetCollection: "users",
      status: "SUCCESS",
      details: `Issued hashed 6-digit password reset OTP (10m expiry) for @${user.username}.`,
      req,
    });

    res.json({
      verified: true,
      username: user.username,
      email: user.email,
      devOtpPreview: process.env.NODE_ENV === "production" ? undefined : otp,
    });
  }
);

router.put(
  "/auth/reset-password",
  authRateLimiter,
  async (req: Request, res: Response) => {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const otp = String(req.body?.otp ?? "").trim();
    const newPassword = String(req.body?.newPassword ?? "");

    if (newPassword.length < 6) {
      res
        .status(400)
        .json({ message: "New password must be at least 6 characters." });
      return;
    }

    const user = await UserModel.findOne({ email });
    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      await recordAudit({
        actorUsername: email || "anonymous",
        action: "AUTH_PASSWORD_RESET",
        targetCollection: "users",
        status: "FAILURE",
        details: "Password reset attempted without an active OTP request.",
        req,
      });
      res
        .status(400)
        .json({ message: "No active OTP reset request for this email." });
      return;
    }

    if (Date.now() > new Date(user.resetOtpExpiresAt).getTime()) {
      await recordAudit({
        actorUserId: user._id,
        actorUsername: user.username,
        action: "AUTH_PASSWORD_RESET",
        targetCollection: "users",
        status: "FAILURE",
        details: `Expired OTP used on reset attempt for @${user.username}.`,
        req,
      });
      res
        .status(400)
        .json({ message: "OTP expired. Request a new verification code." });
      return;
    }

    const otpValid = await bcrypt.compare(otp, user.resetOtpHash);
    if (!otpValid) {
      await recordAudit({
        actorUserId: user._id,
        actorUsername: user.username,
        action: "AUTH_PASSWORD_RESET",
        targetCollection: "users",
        status: "FAILURE",
        details: `Invalid 6-digit OTP submitted for @${user.username}.`,
        req,
      });
      res.status(400).json({ message: "Incorrect 6-digit OTP code." });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtpHash = undefined;
    user.resetOtpExpiresAt = undefined;
    await user.save();

    await recordAudit({
      actorUserId: user._id,
      actorUsername: user.username,
      action: "AUTH_PASSWORD_RESET",
      targetCollection: "users",
      status: "SUCCESS",
      details: `Completed OTP-verified password reset for @${user.username}.`,
      req,
    });

    res.json(await toClientUser(user));
  }
);

// --- SELF PROFILE & LIKED SHOES (Signed-In User) ---

router.put(
  "/users/me",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const me = req.authUser!;
    const updates: Record<string, unknown> = {};
    let passwordChanged = false;

    if (typeof req.body?.username === "string" && req.body.username.trim()) {
      updates.username = req.body.username.trim();
    }
    if (typeof req.body?.email === "string" && req.body.email.trim()) {
      updates.email = req.body.email.trim().toLowerCase();
    }
    if (
      typeof req.body?.password === "string" &&
      req.body.password.length >= 6
    ) {
      updates.password = await bcrypt.hash(req.body.password, 10);
      passwordChanged = true;
    }
    if (Array.isArray(req.body?.likedShoeIds)) {
      updates.likedProductIds = await resolveLikedProductObjectIds(
        req.body.likedShoeIds
      );
    }

    const updated = await UserModel.findByIdAndUpdate(me._id, updates, {
      returnDocument: "after",
    });
    if (!updated) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    await recordAudit({
      actorUserId: updated._id,
      actorUsername: updated.username,
      action: passwordChanged ? "PROFILE_PASSWORD_CHANGE" : "PROFILE_UPDATE",
      targetCollection: "users",
      status: "SUCCESS",
      details: passwordChanged
        ? `User @${updated.username} changed account password.`
        : `User @${updated.username} updated profile / wishlist preferences.`,
      req,
    });

    res.json(await toClientUser(updated));
  }
);

// --- USERS CRUD (Admin RBAC Protected) ---

router.get(
  "/users",
  requireAuth,
  requireAdmin,
  async (_req: Request, res: Response) => {
    const users = await UserModel.find()
      .populate("likedProductIds", "id")
      .sort({ createdAt: -1 });
    res.json(users.map((u) => serializeUser(u)));
  }
);

router.post(
  "/users",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.authUser!;
    const username = String(req.body?.username ?? "").trim();
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");
    const role = req.body?.role === "admin" ? "admin" : "customer";

    if (username.length < 3 || !email.includes("@") || password.length < 6) {
      res
        .status(400)
        .json({ message: "Valid username, email, and password (min 6) required." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      username,
      email,
      password: passwordHash,
      role,
      likedProductIds: [],
    });

    await recordAudit({
      actorUserId: adminUser._id,
      actorUsername: adminUser.username,
      action: "USER_CREATE",
      targetCollection: "users",
      status: "SUCCESS",
      details: `Admin @${adminUser.username} created ${role} account @${user.username}.`,
      req,
    });

    res.status(201).json(await toClientUser(user));
  }
);

router.put(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.authUser!;
    const updates: Record<string, unknown> = {};
    if (typeof req.body?.username === "string" && req.body.username.trim()) {
      updates.username = req.body.username.trim();
    }
    if (typeof req.body?.email === "string" && req.body.email.trim()) {
      updates.email = req.body.email.trim().toLowerCase();
    }
    if (req.body?.role === "admin" || req.body?.role === "customer") {
      updates.role = req.body.role;
    }
    if (
      typeof req.body?.password === "string" &&
      req.body.password.length >= 6
    ) {
      updates.password = await bcrypt.hash(req.body.password, 10);
    }
    if (Array.isArray(req.body?.likedShoeIds)) {
      updates.likedProductIds = await resolveLikedProductObjectIds(
        req.body.likedShoeIds
      );
    }

    const updated = await UserModel.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: "after",
    });
    if (!updated) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    await recordAudit({
      actorUserId: adminUser._id,
      actorUsername: adminUser.username,
      action: "USER_UPDATE",
      targetCollection: "users",
      status: "SUCCESS",
      details: `Admin @${adminUser.username} updated user @${updated.username} (role: ${updated.role}).`,
      req,
    });

    res.json(await toClientUser(updated));
  }
);

router.delete(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.authUser!;
    if (String(adminUser._id) === req.params.id) {
      res
        .status(400)
        .json({ message: "You cannot delete your active admin account." });
      return;
    }
    const deleted = await UserModel.findByIdAndDelete(req.params.id);
    if (deleted) {
      await Promise.all([
        BasketModel.deleteOne({ userId: deleted._id }),
        ReviewModel.deleteMany({ userId: deleted._id }),
      ]);
      await recordAudit({
        actorUserId: adminUser._id,
        actorUsername: adminUser.username,
        action: "USER_DELETE",
        targetCollection: "users",
        status: "SUCCESS",
        details: `Admin @${adminUser.username} removed user @${deleted.username}.`,
        req,
      });
    }
    res.json({ deleted: true });
  }
);

// --- PRODUCTS, IMAGE UPLOAD & NORMALIZED REVIEWS CRUD ---

router.get("/products", async (_req: Request, res: Response) => {
  const products = await ProductModel.find().sort({ createdAt: -1 });
  res.json(await attachProductReviews(products));
});

router.post(
  "/products/upload",
  requireAuth,
  requireAdmin,
  uploadShoeAngles,
  (req: Request, res: Response) => {
    const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
    const urls: Record<string, string> = {};
    for (const [field, fileList] of Object.entries(files)) {
      const first = fileList?.[0];
      if (first) {
        urls[field] = `/uploads/shoes/${first.filename}`;
      }
    }
    if (Object.keys(urls).length === 0) {
      res.status(400).json({ message: "No image files were uploaded." });
      return;
    }
    res.status(201).json({ urls });
  }
);

router.post(
  "/products/seed-demo",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.authUser!;
    const customer =
      (await UserModel.findOne({ role: "customer" })) ?? adminUser;

    const inserted = [];
    for (const shoe of STARTER_DEMO_SHOES) {
      const exists = await ProductModel.findOne({ id: shoe.id });
      if (!exists) {
        const created = await ProductModel.create({
          ...shoe,
          createdBy: adminUser._id,
        });
        const starterReviews = STARTER_SHOE_REVIEWS[shoe.id] ?? [];
        for (const rev of starterReviews) {
          await ReviewModel.create({
            productId: created._id,
            userId: customer._id,
            author: rev.author,
            location: rev.location,
            rating: rev.rating,
            title: rev.title,
            comment: rev.comment,
            date: rev.date,
          });
        }
        inserted.push(created);
      }
    }

    const cGold = await ProductModel.findOne({ id: "caitlin-1-ep-gold" });
    const cRoyal = await ProductModel.findOne({ id: "caitlin-1-ep-royal" });
    if (cGold && cRoyal && !cRoyal.parentProductId) {
      cRoyal.parentProductId = cGold._id;
      cRoyal.modelGroup = cGold.modelGroup || "caitlin-1-ep";
      await cRoyal.save();
    }

    await recordAudit({
      actorUserId: adminUser._id,
      actorUsername: adminUser.username,
      action: "PRODUCT_SEED",
      targetCollection: "products",
      status: "SUCCESS",
      details: `Admin @${adminUser.username} ensured starter demo catalog (${inserted.length} inserted).`,
      req,
    });

    const all = await ProductModel.find().sort({ createdAt: -1 });
    res.status(201).json({
      insertedCount: inserted.length,
      products: await attachProductReviews(all),
    });
  }
);

router.post(
  "/products",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.authUser!;
    const body = req.body ?? {};
    if (!body.name || !body.category || !body.angles?.lateral) {
      res.status(400).json({
        message: "Shoe name, category, and Lateral Profile image are required.",
      });
      return;
    }

    const { reviews: _ignoredReviews, ...cleanBody } = body as Record<
      string,
      unknown
    >;

    let resolvedParentId: Types.ObjectId | null = null;
    let resolvedModelGroup =
      typeof cleanBody.modelGroup === "string" && cleanBody.modelGroup.trim()
        ? cleanBody.modelGroup.trim()
        : deriveModelGroup(String(cleanBody.name));

    if (
      typeof cleanBody.parentProductId === "string" &&
      mongoose.isValidObjectId(cleanBody.parentProductId)
    ) {
      const parentDoc = await ProductModel.findById(cleanBody.parentProductId);
      if (parentDoc) {
        resolvedParentId = parentDoc._id;
        resolvedModelGroup =
          parentDoc.modelGroup || deriveModelGroup(parentDoc.name);
        if (!parentDoc.modelGroup) {
          parentDoc.modelGroup = resolvedModelGroup;
          await parentDoc.save();
        }
      }
    }

    const payload = {
      ...cleanBody,
      modelGroup: resolvedModelGroup,
      parentProductId: resolvedParentId,
      createdBy: adminUser._id,
      id:
        cleanBody.id ||
        `${String(cleanBody.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
      sku: cleanBody.sku || `SLP-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    const product = await ProductModel.create(payload);

    await recordAudit({
      actorUserId: adminUser._id,
      actorUsername: adminUser.username,
      action: "PRODUCT_CREATE",
      targetCollection: "products",
      targetProductId: product._id,
      status: "SUCCESS",
      details: `Admin @${adminUser.username} added shoe ${product.name} (${product.sku}).`,
      req,
    });

    const [hydrated] = await attachProductReviews([product]);
    res.status(201).json(hydrated);
  }
);

router.put(
  "/products/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.authUser!;
    const { reviews: _ignoredReviews, ...updates } = (req.body ??
      {}) as Record<string, unknown>;

    if ("parentProductId" in updates) {
      const rawParent = updates.parentProductId;
      if (!rawParent) {
        updates.parentProductId = null;
      } else if (
        typeof rawParent === "string" &&
        mongoose.isValidObjectId(rawParent)
      ) {
        const parentDoc = await ProductModel.findById(rawParent);
        if (parentDoc) {
          updates.parentProductId = parentDoc._id;
          updates.modelGroup =
            parentDoc.modelGroup || deriveModelGroup(parentDoc.name);
          if (!parentDoc.modelGroup) {
            parentDoc.modelGroup = String(updates.modelGroup);
            await parentDoc.save();
          }
        }
      } else {
        delete updates.parentProductId;
      }
    }

    const updated = await ProductModel.findOneAndUpdate(
      { id: req.params.id },
      updates,
      { returnDocument: "after", runValidators: true }
    );
    if (!updated) {
      res.status(404).json({ message: "Shoe not found." });
      return;
    }

    await recordAudit({
      actorUserId: adminUser._id,
      actorUsername: adminUser.username,
      action: "PRODUCT_UPDATE",
      targetCollection: "products",
      targetProductId: updated._id,
      status: "SUCCESS",
      details: `Admin @${adminUser.username} updated shoe ${updated.name} (stock: ${updated.stock}, ₱${updated.price}).`,
      req,
    });

    const [hydrated] = await attachProductReviews([updated]);
    res.json(hydrated);
  }
);

router.delete(
  "/products/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.authUser!;
    const deleted = await ProductModel.findOneAndDelete({ id: req.params.id });
    if (deleted) {
      await Promise.all([
        ReviewModel.deleteMany({ productId: deleted._id }),
        BasketModel.updateMany(
          {},
          { $pull: { items: { productId: deleted._id } } }
        ),
        UserModel.updateMany(
          {},
          { $pull: { likedProductIds: deleted._id } }
        ),
      ]);
      await recordAudit({
        actorUserId: adminUser._id,
        actorUsername: adminUser.username,
        action: "PRODUCT_DELETE",
        targetCollection: "products",
        targetProductId: deleted._id,
        status: "SUCCESS",
        details: `Admin @${adminUser.username} removed shoe ${deleted.name} (${deleted.sku}).`,
        req,
      });
    }
    res.json({ deleted: true });
  }
);

router.post(
  "/products/:id/reviews",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const product = await ProductModel.findOne({ id: req.params.id });
    if (!product) {
      res.status(404).json({ message: "Shoe not found." });
      return;
    }

    const rating = Math.min(5, Math.max(1, Number(req.body?.rating ?? 5)));
    const title = String(req.body?.title ?? "").trim();
    const comment = String(req.body?.comment ?? "").trim();
    const location =
      String(req.body?.location ?? "Philippines").trim() || "Philippines";

    if (!title || !comment) {
      res
        .status(400)
        .json({ message: "Review title and comment are required." });
      return;
    }

    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

    await ReviewModel.create({
      productId: product._id,
      userId: user._id,
      author: user.username,
      location,
      rating,
      title,
      comment,
      date: dateStr,
    });

    await recordAudit({
      actorUserId: user._id,
      actorUsername: user.username,
      action: "REVIEW_CREATE",
      targetCollection: "reviews",
      targetProductId: product._id,
      status: "SUCCESS",
      details: `@${user.username} posted a ${rating}★ review on ${product.name}.`,
      req,
    });

    const [hydrated] = await attachProductReviews([product]);
    res.status(201).json(hydrated);
  }
);

router.delete(
  "/products/:id/reviews/:reviewId",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const product = await ProductModel.findOne({ id: req.params.id });
    if (!product) {
      res.status(404).json({ message: "Shoe not found." });
      return;
    }

    if (!mongoose.isValidObjectId(req.params.reviewId)) {
      res.status(404).json({ message: "Review not found." });
      return;
    }

    const target = await ReviewModel.findOne({
      _id: req.params.reviewId,
      productId: product._id,
    });
    if (!target) {
      res.status(404).json({ message: "Review not found." });
      return;
    }

    if (user.role !== "admin" && String(target.userId) !== String(user._id)) {
      res
        .status(403)
        .json({ message: "You can only delete your own review." });
      return;
    }

    await target.deleteOne();

    await recordAudit({
      actorUserId: user._id,
      actorUsername: user.username,
      action: "REVIEW_DELETE",
      targetCollection: "reviews",
      targetProductId: product._id,
      status: "SUCCESS",
      details: `@${user.username} deleted review on ${product.name}.`,
      req,
    });

    const [hydrated] = await attachProductReviews([product]);
    res.json(hydrated);
  }
);

// --- PERSISTENT MONGODB BASKET CRUD (Linked to User & Product ObjectIds) ---

router.get(
  "/basket",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const items = await getHydratedBasketForUser(req.authUser!._id);
    res.json({ items });
  }
);

router.put(
  "/basket",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const shoeIds = rawItems
      .map((item: { shoeId?: unknown }) => String(item?.shoeId ?? ""))
      .filter(Boolean);

    const dbProducts = await ProductModel.find({ id: { $in: shoeIds } });
    const bySlug = new Map(dbProducts.map((p) => [p.id, p]));

    const resolvedItems = [];
    for (const raw of rawItems as {
      shoeId?: string;
      size?: string;
      quantity?: number;
    }[]) {
      const dbProd = bySlug.get(String(raw.shoeId ?? ""));
      if (!dbProd || dbProd.stock <= 0) continue;
      const qty = Math.min(
        dbProd.stock,
        Math.max(1, Math.floor(Number(raw.quantity ?? 1)))
      );
      resolvedItems.push({
        productId: dbProd._id,
        shoeId: dbProd.id,
        size: String(raw.size ?? "US 9"),
        quantity: qty,
      });
    }

    await BasketModel.findOneAndUpdate(
      { userId: user._id },
      { userId: user._id, items: resolvedItems },
      { upsert: true, returnDocument: "after" }
    );

    await recordAudit({
      actorUserId: user._id,
      actorUsername: user.username,
      action: "BASKET_SYNC",
      targetCollection: "baskets",
      targetProductId: resolvedItems[0]?.productId ?? null,
      status: "SUCCESS",
      details: `Synced ${resolvedItems.length} basket line item(s) to MongoDB for @${user.username}.`,
      req,
    });

    const items = await getHydratedBasketForUser(user._id);
    res.json({ items });
  }
);

router.delete(
  "/basket",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    await BasketModel.findOneAndUpdate(
      { userId: user._id },
      { userId: user._id, items: [] },
      { upsert: true }
    );
    res.json({ items: [] });
  }
);

// --- ORDERS & ATOMIC CHECKOUT CRUD ---

router.get(
  "/orders",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const query = user.role === "admin" ? {} : { userId: user._id };
    const orders = await OrderModel.find(query).sort({ createdAt: -1 });
    res.json(orders);
  }
);

router.post(
  "/orders",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      res
        .status(400)
        .json({ message: "Order must contain at least one item." });
      return;
    }

    let serverTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const qty = Math.max(1, Math.floor(Number(item.quantity)));
      const dbProduct = await ProductModel.findOne({ id: String(item.shoeId) });
      if (!dbProduct) {
        res.status(404).json({
          message: `Shoe ${item.shoeName ?? item.shoeId} not found.`,
        });
        return;
      }
      if (dbProduct.stock < qty) {
        res.status(400).json({
          message: `Insufficient stock for ${dbProduct.name}. Only ${dbProduct.stock} left.`,
        });
        return;
      }
      serverTotal += dbProduct.price * qty;
      verifiedItems.push({
        productId: dbProduct._id,
        shoeId: dbProduct.id,
        shoeName: dbProduct.name,
        size: String(item.size ?? "US 9"),
        quantity: qty,
        price: dbProduct.price,
        imageUrl: dbProduct.angles.lateral,
      });
    }

    for (const item of verifiedItems) {
      await ProductModel.findOneAndUpdate(
        { _id: item.productId },
        { $inc: { stock: -item.quantity } }
      );
    }

    const paymentMethod = req.body?.paymentMethod ?? "COD";
    const orderNumber = `SLP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await OrderModel.create({
      orderNumber,
      userId: user._id,
      username: user.username,
      userEmail: user.email,
      items: verifiedItems,
      totalAmount: serverTotal,
      paymentMethod,
      shippingAddress: req.body?.shippingAddress,
      status: paymentMethod === "COD" ? "Pending" : "Paid",
    });

    await BasketModel.findOneAndUpdate(
      { userId: user._id },
      { userId: user._id, items: [] },
      { upsert: true }
    );

    await recordAudit({
      actorUserId: user._id,
      actorUsername: user.username,
      action: "ORDER_CREATE",
      targetCollection: "orders",
      targetProductId: verifiedItems[0]?.productId ?? null,
      targetOrderId: order._id,
      status: "SUCCESS",
      details: `@${user.username} placed order ${order.orderNumber} (₱${serverTotal}) via ${paymentMethod}.`,
      req,
    });

    res.status(201).json(order);
  }
);

router.put(
  "/orders/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.authUser!;
    const updated = await OrderModel.findByIdAndUpdate(
      req.params.id,
      { status: req.body?.status },
      { returnDocument: "after", runValidators: true }
    );
    if (!updated) {
      res.status(404).json({ message: "Order not found." });
      return;
    }

    await recordAudit({
      actorUserId: adminUser._id,
      actorUsername: adminUser.username,
      action: "ORDER_STATUS_UPDATE",
      targetCollection: "orders",
      targetOrderId: updated._id,
      status: "SUCCESS",
      details: `Admin @${adminUser.username} set ${updated.orderNumber} status → ${updated.status}.`,
      req,
    });

    res.json(updated);
  }
);

router.delete(
  "/orders/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.authUser!;
    const deleted = await OrderModel.findByIdAndDelete(req.params.id);
    if (deleted) {
      await recordAudit({
        actorUserId: adminUser._id,
        actorUsername: adminUser.username,
        action: "ORDER_DELETE",
        targetCollection: "orders",
        targetOrderId: deleted._id,
        status: "SUCCESS",
        details: `Admin @${adminUser.username} deleted order ${deleted.orderNumber}.`,
        req,
      });
    }
    res.json({ deleted: true });
  }
);

// --- INFORMATION ASSURANCE AUDIT LOGS (Admin RBAC Protected) ---

router.get(
  "/audit-logs",
  requireAuth,
  requireAdmin,
  async (_req: Request, res: Response) => {
    const logs = await AuditLogModel.find()
      .sort({ createdAt: -1 })
      .limit(150)
      .populate("actorUserId", "username email role")
      .populate("targetProductId", "id name sku")
      .populate("targetOrderId", "orderNumber status");
    res.json(logs);
  }
);

export default router;

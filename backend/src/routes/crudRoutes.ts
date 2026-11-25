import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import {
  clearAuthCookie,
  requireAdmin,
  requireAuth,
  setAuthCookie,
  signAuthToken,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import { authRateLimiter } from "../middleware/securityMiddleware.js";
import { uploadShoeAngles } from "../middleware/uploadMiddleware.js";
import { STARTER_DEMO_SHOES } from "../config/seedBootstrap.js";
import { OrderModel } from "../models/Order.js";
import { ProductModel } from "../models/Product.js";
import { UserModel } from "../models/User.js";

const router = Router();

// --- AUTH & 6-DIGIT OTP FORGOT PASSWORD ---

router.get("/auth/me", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(req.authUser);
});

router.post(
  "/auth/register",
  authRateLimiter,
  async (req: Request, res: Response) => {
    const username = String(req.body?.username ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (username.length < 3 || !email.includes("@") || password.length < 6) {
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
      res.status(409).json({ message: "Username or email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      username,
      email,
      password: passwordHash,
      role: "customer",
      likedShoeIds: [],
    });

    const token = signAuthToken(user);
    setAuthCookie(res, token);
    res.status(201).json(user);
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
      res.status(401).json({ message: "Invalid username or password." });
      return;
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      res.status(401).json({ message: "Invalid username or password." });
      return;
    }

    const token = signAuthToken(user);
    setAuthCookie(res, token);
    res.json(user);
  }
);

router.post("/auth/logout", (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.post(
  "/auth/verify-email",
  authRateLimiter,
  async (req: Request, res: Response) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "No account found with that email address." });
      return;
    }

    const otp = String(crypto.randomInt(100000, 999999));
    user.resetOtpHash = await bcrypt.hash(otp, 8);
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

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
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const otp = String(req.body?.otp ?? "").trim();
    const newPassword = String(req.body?.newPassword ?? "");

    if (newPassword.length < 6) {
      res.status(400).json({ message: "New password must be at least 6 characters." });
      return;
    }

    const user = await UserModel.findOne({ email });
    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      res.status(400).json({ message: "No active OTP reset request for this email." });
      return;
    }

    if (Date.now() > new Date(user.resetOtpExpiresAt).getTime()) {
      res.status(400).json({ message: "OTP expired. Request a new verification code." });
      return;
    }

    const otpValid = await bcrypt.compare(otp, user.resetOtpHash);
    if (!otpValid) {
      res.status(400).json({ message: "Incorrect 6-digit OTP code." });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtpHash = undefined;
    user.resetOtpExpiresAt = undefined;
    await user.save();

    res.json(user);
  }
);

// --- SELF PROFILE & LIKED SHOES (Signed-In User) ---

router.put(
  "/users/me",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const me = req.authUser!;
    const updates: Record<string, unknown> = {};

    if (typeof req.body?.username === "string" && req.body.username.trim()) {
      updates.username = req.body.username.trim();
    }
    if (typeof req.body?.email === "string" && req.body.email.trim()) {
      updates.email = req.body.email.trim().toLowerCase();
    }
    if (typeof req.body?.password === "string" && req.body.password.length >= 6) {
      updates.password = await bcrypt.hash(req.body.password, 10);
    }
    if (Array.isArray(req.body?.likedShoeIds)) {
      updates.likedShoeIds = req.body.likedShoeIds.map(String);
    }

    const updated = await UserModel.findByIdAndUpdate(me._id, updates, {
      new: true,
    });
    res.json(updated);
  }
);

// --- USERS CRUD (Admin RBAC Protected) ---

router.get("/users", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const users = await UserModel.find().sort({ createdAt: -1 });
  res.json(users);
});

router.post("/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const username = String(req.body?.username ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const role = req.body?.role === "admin" ? "admin" : "customer";

  if (username.length < 3 || !email.includes("@") || password.length < 6) {
    res.status(400).json({ message: "Valid username, email, and password (min 6) required." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    username,
    email,
    password: passwordHash,
    role,
    likedShoeIds: [],
  });
  res.status(201).json(user);
});

router.put("/users/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
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
  if (typeof req.body?.password === "string" && req.body.password.length >= 6) {
    updates.password = await bcrypt.hash(req.body.password, 10);
  }
  if (Array.isArray(req.body?.likedShoeIds)) {
    updates.likedShoeIds = req.body.likedShoeIds.map(String);
  }

  const updated = await UserModel.findByIdAndUpdate(req.params.id, updates, {
    new: true,
  });
  if (!updated) {
    res.status(404).json({ message: "User not found." });
    return;
  }
  res.json(updated);
});

router.delete(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    if (String(req.authUser?._id) === req.params.id) {
      res.status(400).json({ message: "You cannot delete your active admin account." });
      return;
    }
    await UserModel.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  }
);

// --- PRODUCTS, IMAGE UPLOAD & REVIEWS CRUD ---

router.get("/products", async (_req: Request, res: Response) => {
  const products = await ProductModel.find().sort({ createdAt: -1 });
  res.json(products);
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
  async (_req: Request, res: Response) => {
    const inserted = [];
    for (const shoe of STARTER_DEMO_SHOES) {
      const exists = await ProductModel.findOne({ id: shoe.id });
      if (!exists) {
        const created = await ProductModel.create(shoe);
        inserted.push(created);
      }
    }
    const all = await ProductModel.find().sort({ createdAt: -1 });
    res.status(201).json({ insertedCount: inserted.length, products: all });
  }
);

router.post("/products", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!body.name || !body.category || !body.angles?.lateral) {
    res.status(400).json({
      message: "Shoe name, category, and Lateral Profile image are required.",
    });
    return;
  }

  const payload = {
    ...body,
    id:
      body.id ||
      `${String(body.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
    sku: body.sku || `SLP-${Math.floor(1000 + Math.random() * 9000)}`,
  };

  const product = await ProductModel.create(payload);
  res.status(201).json(product);
});

router.put("/products/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const updated = await ProductModel.findOneAndUpdate(
    { id: req.params.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!updated) {
    res.status(404).json({ message: "Shoe not found." });
    return;
  }
  res.json(updated);
});

router.delete("/products/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  await ProductModel.findOneAndDelete({ id: req.params.id });
  res.json({ deleted: true });
});

router.post(
  "/products/:id/reviews",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const rating = Math.min(5, Math.max(1, Number(req.body?.rating ?? 5)));
    const title = String(req.body?.title ?? "").trim();
    const comment = String(req.body?.comment ?? "").trim();
    const location = String(req.body?.location ?? "Philippines").trim() || "Philippines";

    if (!title || !comment) {
      res.status(400).json({ message: "Review title and comment are required." });
      return;
    }

    const review = {
      id: `rev-${Date.now()}`,
      userId: String(user._id),
      author: user.username,
      location,
      rating,
      title,
      comment,
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    };

    const updated = await ProductModel.findOneAndUpdate(
      { id: req.params.id },
      { $push: { reviews: { $each: [review], $position: 0 } } },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ message: "Shoe not found." });
      return;
    }
    res.status(201).json(updated);
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

    const target = product.reviews.find(
      (r: { id: string; userId: string }) => r.id === req.params.reviewId
    );
    if (!target) {
      res.status(404).json({ message: "Review not found." });
      return;
    }

    if (user.role !== "admin" && target.userId !== String(user._id)) {
      res.status(403).json({ message: "You can only delete your own review." });
      return;
    }

    product.reviews = product.reviews.filter(
      (r: { id: string }) => r.id !== req.params.reviewId
    );
    await product.save();
    res.json(product);
  }
);

// --- ORDERS & ATOMIC CHECKOUT CRUD ---

router.get("/orders", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  const query = user.role === "admin" ? {} : { userId: String(user._id) };
  const orders = await OrderModel.find(query).sort({ createdAt: -1 });
  res.json(orders);
});

router.post("/orders", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) {
    res.status(400).json({ message: "Order must contain at least one item." });
    return;
  }

  let serverTotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const qty = Math.max(1, Math.floor(Number(item.quantity)));
    const dbProduct = await ProductModel.findOne({ id: String(item.shoeId) });
    if (!dbProduct) {
      res.status(404).json({ message: `Shoe ${item.shoeName ?? item.shoeId} not found.` });
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
      { id: item.shoeId },
      { $inc: { stock: -item.quantity } }
    );
  }

  const paymentMethod = req.body?.paymentMethod ?? "COD";
  const orderNumber = `SLP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await OrderModel.create({
    orderNumber,
    userId: String(user._id),
    username: user.username,
    userEmail: user.email,
    items: verifiedItems,
    totalAmount: serverTotal,
    paymentMethod,
    shippingAddress: req.body?.shippingAddress,
    status: paymentMethod === "COD" ? "Pending" : "Paid",
  });

  res.status(201).json(order);
});

router.put("/orders/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const updated = await OrderModel.findByIdAndUpdate(
    req.params.id,
    { status: req.body?.status },
    { new: true, runValidators: true }
  );
  if (!updated) {
    res.status(404).json({ message: "Order not found." });
    return;
  }
  res.json(updated);
});

router.delete("/orders/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  await OrderModel.findByIdAndDelete(req.params.id);
  res.json({ deleted: true });
});

export default router;

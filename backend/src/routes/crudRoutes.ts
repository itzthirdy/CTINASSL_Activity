import { Router, type Request, type Response } from "express";
import { UserModel } from "../models/User.js";
import { ProductModel } from "../models/Product.js";
import { OrderModel } from "../models/Order.js";

const router = Router();

// --- AUTH & FORGOT PASSWORD CRUD ---

// CREATE User (Register: username, email, password)
router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const existing = await UserModel.findOne({
      $or: [{ username }, { email: email?.toLowerCase() }],
    });
    if (existing) {
      res.status(400).json({ message: "Username or email already exists." });
      return;
    }
    const user = await UserModel.create({
      username,
      email: email.toLowerCase(),
      password,
      role: "customer",
      likedShoeIds: [],
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: String(err) });
  }
});

// READ User for Login (Username + Password ONLY, no email required)
router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = await UserModel.findOne({ username, password });
    if (!user) {
      res.status(401).json({ message: "Invalid username or password." });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: String(err) });
  }
});

// Verify Email for Forgot Password
router.post("/auth/verify-email", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email: email?.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: "No account found with that email address." });
      return;
    }
    res.json({ verified: true, userId: user._id, username: user.username, email: user.email });
  } catch (err) {
    res.status(500).json({ message: "Verification failed", error: String(err) });
  }
});

// UPDATE Password (CRUD Update on Change Password Dashboard after email verified)
router.put("/auth/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    const user = await UserModel.findOneAndUpdate(
      { email: email?.toLowerCase() },
      { password: newPassword },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ message: "Account not found." });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Password update failed", error: String(err) });
  }
});

// --- USERS CRUD (Admin & Profile) ---

router.get("/users", async (_req: Request, res: Response) => {
  const users = await UserModel.find().sort({ createdAt: -1 });
  res.json(users);
});

router.post("/users", async (req: Request, res: Response) => {
  const user = await UserModel.create(req.body);
  res.status(201).json(user);
});

router.put("/users/:id", async (req: Request, res: Response) => {
  const updated = await UserModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updated);
});

router.delete("/users/:id", async (req: Request, res: Response) => {
  await UserModel.findByIdAndDelete(req.params.id);
  res.json({ deleted: true });
});

// --- PRODUCTS & STOCK INVENTORY CRUD ---

router.get("/products", async (_req: Request, res: Response) => {
  const products = await ProductModel.find();
  res.json(products);
});

router.post("/products", async (req: Request, res: Response) => {
  const product = await ProductModel.create(req.body);
  res.status(201).json(product);
});

router.put("/products/:id", async (req: Request, res: Response) => {
  const updated = await ProductModel.findOneAndUpdate(
    { id: req.params.id },
    req.body,
    { new: true }
  );
  res.json(updated);
});

router.delete("/products/:id", async (req: Request, res: Response) => {
  await ProductModel.findOneAndDelete({ id: req.params.id });
  res.json({ deleted: true });
});

// --- ORDERS & PAYMENT CHECKOUT CRUD ---

router.get("/orders", async (_req: Request, res: Response) => {
  const orders = await OrderModel.find().sort({ createdAt: -1 });
  res.json(orders);
});

router.post("/orders", async (req: Request, res: Response) => {
  const order = await OrderModel.create(req.body);
  // Deduct stock for each purchased item
  for (const item of order.items) {
    await ProductModel.findOneAndUpdate(
      { id: item.shoeId },
      { $inc: { stock: -Math.abs(item.quantity) } }
    );
  }
  res.status(201).json(order);
});

router.put("/orders/:id", async (req: Request, res: Response) => {
  const updated = await OrderModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updated);
});

router.delete("/orders/:id", async (req: Request, res: Response) => {
  await OrderModel.findByIdAndDelete(req.params.id);
  res.json({ deleted: true });
});

export default router;

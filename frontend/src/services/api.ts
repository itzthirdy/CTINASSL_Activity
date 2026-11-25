import axios from "axios";
import type { BasketItem } from "../components/BasketDrawer";
import { FEATURED_SHOES } from "../data/shoeCatalog";
import type {
  AngleKey,
  AnimationPresetType,
  FeaturedShoe,
  ShoeAngleSet,
  ShoeCategory,
  ShoeReview,
} from "../data/shoeCatalog";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  withCredentials: true,
  timeout: 4500,
});

export interface AppUser {
  _id: string;
  username: string;
  email: string;
  password?: string;
  role: "customer" | "admin";
  likedShoeIds: string[];
  likedProductIds?: string[];
  createdAt: string;
}

export interface AuditLogRecord {
  _id: string;
  actorUserId?:
    | { _id: string; username: string; email: string; role: string }
    | string
    | null;
  actorUsername: string;
  action: string;
  targetCollection:
    | "users"
    | "products"
    | "baskets"
    | "reviews"
    | "orders"
    | "system";
  targetProductId?:
    | { _id: string; id: string; name: string; sku: string }
    | string
    | null;
  targetOrderId?:
    | { _id: string; orderNumber: string; status: string }
    | string
    | null;
  status: "SUCCESS" | "FAILURE";
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface OrderItemRecord {
  shoeId: string;
  shoeName: string;
  size: string;
  quantity: number;
  price: number;
  imageUrl: string;
}

export type PaymentMethodType = "COD" | "E-Wallet" | "Debit/Credit Card";

export type OrderStatusType = "Pending" | "Paid" | "Shipped" | "Delivered";

export interface ShippingAddressRecord {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface OrderRecord {
  _id: string;
  orderNumber: string;
  userId: string;
  username: string;
  userEmail: string;
  items: OrderItemRecord[];
  totalAmount: number;
  paymentMethod: PaymentMethodType;
  shippingAddress: ShippingAddressRecord;
  status: OrderStatusType;
  createdAt: string;
}

export interface CreateShoeInput {
  name: string;
  colorwayName: string;
  modelGroup?: string;
  parentProductId?: string | null;
  category: Exclude<ShoeCategory, "All Shoes">;
  price: number;
  stock: number;
  badge?: string;
  heroWord?: string;
  tagline?: string;
  description?: string;
  accentHex?: string;
  glowRgb?: string;
  roomRgb?: [number, number, number];
  featuredInHero?: boolean;
  animationPreset?: AnimationPresetType;
  cutoutSensitivity?: number;
  sizes?: string[];
  angles: ShoeAngleSet;
}

const LS_USERS_KEY = "sp_mern_users_v2";
const LS_PRODUCTS_KEY = "sp_mern_products_v2";
const LS_ORDERS_KEY = "sp_mern_orders_v2";
const LS_SESSION_KEY = "sp_mern_session_v2";
const LS_OTP_KEY = "sp_mern_otp_v2";

const DEFAULT_USERS: AppUser[] = [
  {
    _id: "usr-admin-01",
    username: "admin",
    email: "admin@solepurpose.ph",
    password: "admin123",
    role: "admin",
    likedShoeIds: [],
    createdAt: "2026-11-01T08:00:00.000Z",
  },
  {
    _id: "usr-cust-01",
    username: "thirdy",
    email: "thirdy@solepurpose.ph",
    password: "sole123",
    role: "customer",
    likedShoeIds: [],
    createdAt: "2026-11-10T10:30:00.000Z",
  },
];

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const serverMsg = (err.response?.data as { message?: string } | undefined)?.message;
    if (serverMsg) return serverMsg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function isNetworkFailure(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  return !err.response;
}

function readLocalUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(LS_USERS_KEY);
    if (!raw) {
      localStorage.setItem(LS_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(raw) as AppUser[];
  } catch {
    return DEFAULT_USERS;
  }
}

function writeLocalUsers(users: AppUser[]): void {
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
}

function readLocalProducts(): FeaturedShoe[] {
  try {
    const raw = localStorage.getItem(LS_PRODUCTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FeaturedShoe[];
  } catch {
    return [];
  }
}

function writeLocalProducts(products: FeaturedShoe[]): void {
  localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(products));
}

function readLocalOrders(): OrderRecord[] {
  try {
    const raw = localStorage.getItem(LS_ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OrderRecord[];
  } catch {
    return [];
  }
}

function writeLocalOrders(orders: OrderRecord[]): void {
  localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders));
}

function fileToCompressedWebpDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.9));
      };
      img.onerror = () => resolve(String(reader.result));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export const storeApi = {
  // --- SESSION ---
  getSessionUser(): AppUser | null {
    try {
      const raw = localStorage.getItem(LS_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AppUser;
    } catch {
      return null;
    }
  },

  setSessionUser(user: AppUser | null): void {
    if (!user) {
      localStorage.removeItem(LS_SESSION_KEY);
    } else {
      const { password: _hidden, ...safe } = user;
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify(safe));
    }
  },

  async getCurrentUser(): Promise<AppUser | null> {
    try {
      const res = await httpClient.get<AppUser>("/auth/me");
      this.setSessionUser(res.data);
      return res.data;
    } catch (err) {
      if (isNetworkFailure(err)) {
        return this.getSessionUser();
      }
      this.setSessionUser(null);
      return null;
    }
  },

  // --- AUTH & 6-DIGIT OTP FORGOT PASSWORD ---
  async login(username: string, password: string): Promise<AppUser> {
    const cleanUsername = username.trim();
    try {
      const res = await httpClient.post<AppUser>("/auth/login", {
        username: cleanUsername,
        password,
      });
      this.setSessionUser(res.data);
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Invalid username or password."));
      }
      const users = readLocalUsers();
      const found = users.find(
        (u) =>
          u.username.toLowerCase() === cleanUsername.toLowerCase() &&
          u.password === password
      );
      if (!found) throw new Error("Invalid username or password.");
      this.setSessionUser(found);
      return found;
    }
  },

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<AppUser> {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await httpClient.post<AppUser>("/auth/register", {
        username: cleanUsername,
        email: cleanEmail,
        password,
      });
      this.setSessionUser(res.data);
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Registration failed."));
      }
      const users = readLocalUsers();
      if (
        users.some(
          (u) =>
            u.username.toLowerCase() === cleanUsername.toLowerCase() ||
            u.email.toLowerCase() === cleanEmail
        )
      ) {
        throw new Error("Username or email is already registered.");
      }
      const newUser: AppUser = {
        _id: `usr-${Date.now()}`,
        username: cleanUsername,
        email: cleanEmail,
        password,
        role: "customer",
        likedShoeIds: [],
        createdAt: new Date().toISOString(),
      };
      writeLocalUsers([newUser, ...users]);
      this.setSessionUser(newUser);
      return newUser;
    }
  },

  async logout(): Promise<void> {
    this.setSessionUser(null);
    try {
      await httpClient.post("/auth/logout");
    } catch {
      // Cookie cleared if server reachable
    }
  },

  async verifyEmailForReset(email: string): Promise<{
    verified: true;
    username: string;
    email: string;
    devOtpPreview?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await httpClient.post<{
        verified: true;
        username: string;
        email: string;
        devOtpPreview?: string;
      }>("/auth/verify-email", { email: cleanEmail });
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(
          extractErrorMessage(err, "No account found with that email address.")
        );
      }
      const users = readLocalUsers();
      const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!found) throw new Error("No account found with that email address.");

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      localStorage.setItem(
        LS_OTP_KEY,
        JSON.stringify({
          email: cleanEmail,
          otp,
          expiresAt: Date.now() + 10 * 60 * 1000,
        })
      );
      return {
        verified: true,
        username: found.username,
        email: found.email,
        devOtpPreview: otp,
      };
    }
  },

  async resetPasswordByEmail(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<AppUser> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await httpClient.put<AppUser>("/auth/reset-password", {
        email: cleanEmail,
        otp: otp.trim(),
        newPassword,
      });
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to reset password."));
      }
      const rawOtp = localStorage.getItem(LS_OTP_KEY);
      if (!rawOtp) throw new Error("OTP expired. Request a new code.");
      const parsed = JSON.parse(rawOtp) as {
        email: string;
        otp: string;
        expiresAt: number;
      };
      if (parsed.email !== cleanEmail || Date.now() > parsed.expiresAt) {
        throw new Error("OTP expired. Request a new code.");
      }
      if (parsed.otp !== otp.trim()) {
        throw new Error("Incorrect 6-digit OTP code.");
      }

      const users = readLocalUsers();
      const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (idx === -1) throw new Error("Account not found.");

      const updatedUser: AppUser = { ...users[idx], password: newPassword };
      const next = [...users];
      next[idx] = updatedUser;
      writeLocalUsers(next);
      localStorage.removeItem(LS_OTP_KEY);
      return updatedUser;
    }
  },

  // --- USERS CRUD ---
  async getUsers(): Promise<AppUser[]> {
    try {
      const res = await httpClient.get<AppUser[]>("/users");
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) return [];
      return readLocalUsers().map(({ password: _p, ...safe }) => safe);
    }
  },

  async createUser(data: {
    username: string;
    email: string;
    password: string;
    role: "customer" | "admin";
  }): Promise<AppUser> {
    try {
      const res = await httpClient.post<AppUser>("/users", data);
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to create user."));
      }
      const newUser: AppUser = {
        _id: `usr-${Date.now()}`,
        username: data.username.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        role: data.role,
        likedShoeIds: [],
        createdAt: new Date().toISOString(),
      };
      const users = readLocalUsers();
      writeLocalUsers([newUser, ...users]);
      return newUser;
    }
  },

  async updateSelfProfile(updates: {
    username?: string;
    email?: string;
    password?: string;
    likedShoeIds?: string[];
  }): Promise<AppUser> {
    try {
      const res = await httpClient.put<AppUser>("/users/me", updates);
      this.setSessionUser(res.data);
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to update profile."));
      }
      const current = this.getSessionUser();
      if (!current) throw new Error("Sign in required.");
      return this.updateUser(current._id, updates);
    }
  },

  async updateUser(
    userId: string,
    updates: Partial<
      Pick<AppUser, "username" | "email" | "password" | "role" | "likedShoeIds">
    >
  ): Promise<AppUser> {
    try {
      const res = await httpClient.put<AppUser>(`/users/${userId}`, updates);
      const currentSession = this.getSessionUser();
      if (currentSession && currentSession._id === userId) {
        this.setSessionUser(res.data);
      }
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to update user."));
      }
      const users = readLocalUsers();
      const idx = users.findIndex((u) => u._id === userId);
      if (idx === -1) throw new Error("User not found.");
      const updatedLocal: AppUser = {
        ...users[idx],
        ...updates,
        password: updates.password || users[idx].password,
      };
      const next = [...users];
      next[idx] = updatedLocal;
      writeLocalUsers(next);

      const currentSession = this.getSessionUser();
      if (currentSession && currentSession._id === userId) {
        this.setSessionUser(updatedLocal);
      }
      return updatedLocal;
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      await httpClient.delete(`/users/${userId}`);
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to delete user."));
      }
      writeLocalUsers(readLocalUsers().filter((u) => u._id !== userId));
    }
  },

  // --- PRODUCTS, UPLOADS & REVIEWS CRUD ---
  async getProducts(): Promise<FeaturedShoe[]> {
    try {
      const res = await httpClient.get<FeaturedShoe[]>("/products");
      writeLocalProducts(res.data);
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to load shoes."));
      }
      return readLocalProducts();
    }
  },

  async uploadShoeAngles(
    files: Partial<Record<AngleKey, File>>
  ): Promise<Partial<Record<AngleKey, string>>> {
    const entries = Object.entries(files).filter(([, f]) => Boolean(f)) as [
      AngleKey,
      File,
    ][];
    if (entries.length === 0) return {};

    const formData = new FormData();
    for (const [key, file] of entries) {
      formData.append(key, file);
    }

    try {
      const res = await httpClient.post<{
        urls: Partial<Record<AngleKey, string>>;
      }>("/products/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 15000,
      });
      return res.data.urls;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Image upload failed."));
      }
      const urls: Partial<Record<AngleKey, string>> = {};
      for (const [key, file] of entries) {
        urls[key] = await fileToCompressedWebpDataUrl(file);
      }
      return urls;
    }
  },

  async seedDemoProducts(): Promise<FeaturedShoe[]> {
    try {
      const res = await httpClient.post<{ products: FeaturedShoe[] }>(
        "/products/seed-demo"
      );
      writeLocalProducts(res.data.products);
      return res.data.products;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to seed demo shoes."));
      }
      const existing = readLocalProducts();
      const existingIds = new Set(existing.map((p) => p.id));
      const merged = [
        ...existing,
        ...FEATURED_SHOES.filter((s) => !existingIds.has(s.id)),
      ];
      writeLocalProducts(merged);
      return merged;
    }
  },

  async createProduct(input: CreateShoeInput): Promise<FeaturedShoe> {
    const newShoe: FeaturedShoe = {
      id: `${input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
      sku: `SLP-${Math.floor(1000 + Math.random() * 9000)}`,
      badge: input.badge?.trim() || "New Release",
      name: input.name.trim(),
      colorwayName: input.colorwayName.trim(),
      modelGroup: input.modelGroup,
      parentProductId: input.parentProductId ?? null,
      category: input.category,
      price: Number(input.price),
      stock: Number(input.stock),
      heroWord:
        input.heroWord?.trim().toUpperCase() ||
        input.name.split(" ")[0]?.toUpperCase() ||
        "VELOCITY",
      tagline:
        input.tagline?.trim() ||
        "Engineered performance silhouette curated for Sole Purpose Philippines.",
      description:
        input.description?.trim() ||
        "Engineered performance silhouette curated for Sole Purpose Philippines.",
      accentHex: input.accentHex || "#F59E0B",
      glowRgb: input.glowRgb || "245, 158, 11",
      roomRgb: input.roomRgb?.length === 3 ? input.roomRgb : [52, 56, 72],
      featuredInHero: Boolean(input.featuredInHero),
      animationPreset: input.animationPreset ?? "studio-float",
      cutoutSensitivity: input.cutoutSensitivity ?? 50,
      sizes:
        input.sizes && input.sizes.length > 0
          ? input.sizes
          : ["US 7", "US 8", "US 9", "US 10", "US 11"],
      angles: input.angles,
      reviews: [],
    };

    try {
      const res = await httpClient.post<FeaturedShoe>("/products", newShoe);
      const all = [res.data, ...readLocalProducts()];
      writeLocalProducts(all);
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to create shoe."));
      }
      const all = [newShoe, ...readLocalProducts()];
      writeLocalProducts(all);
      return newShoe;
    }
  },

  async updateProduct(
    shoeId: string,
    updates: Partial<FeaturedShoe>
  ): Promise<FeaturedShoe[]> {
    try {
      await httpClient.put<FeaturedShoe>(`/products/${shoeId}`, updates);
      return await this.getProducts();
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to update shoe."));
      }
      const products = readLocalProducts().map((item) =>
        item.id === shoeId ? { ...item, ...updates } : item
      );
      writeLocalProducts(products);
      return products;
    }
  },

  async deleteProduct(shoeId: string): Promise<FeaturedShoe[]> {
    try {
      await httpClient.delete(`/products/${shoeId}`);
      return await this.getProducts();
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to delete shoe."));
      }
      const products = readLocalProducts().filter((item) => item.id !== shoeId);
      writeLocalProducts(products);
      return products;
    }
  },

  async addProductReview(
    shoeId: string,
    input: { rating: number; title: string; comment: string; location?: string }
  ): Promise<FeaturedShoe[]> {
    try {
      await httpClient.post<FeaturedShoe>(`/products/${shoeId}/reviews`, input);
      return await this.getProducts();
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to post review."));
      }
      const user = this.getSessionUser();
      const review: ShoeReview = {
        id: `rev-${Date.now()}`,
        userId: user?._id,
        author: user?.username ?? "Customer",
        location: input.location?.trim() || "Philippines",
        rating: input.rating,
        title: input.title.trim(),
        comment: input.comment.trim(),
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
      };
      const products = readLocalProducts().map((item) =>
        item.id === shoeId
          ? { ...item, reviews: [review, ...(item.reviews ?? [])] }
          : item
      );
      writeLocalProducts(products);
      return products;
    }
  },

  async deleteProductReview(
    shoeId: string,
    reviewId: string
  ): Promise<FeaturedShoe[]> {
    try {
      await httpClient.delete(`/products/${shoeId}/reviews/${reviewId}`);
      return await this.getProducts();
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to delete review."));
      }
      const products = readLocalProducts().map((item) =>
        item.id === shoeId
          ? {
              ...item,
              reviews: (item.reviews ?? []).filter((r) => r.id !== reviewId),
            }
          : item
      );
      writeLocalProducts(products);
      return products;
    }
  },

  // --- ORDERS & CHECKOUT STOCK DEDUCTION CRUD ---
  async getOrders(): Promise<OrderRecord[]> {
    try {
      const res = await httpClient.get<OrderRecord[]>("/orders");
      writeLocalOrders(res.data);
      return res.data;
    } catch (err) {
      if (!isNetworkFailure(err)) return [];
      const currentUser = this.getSessionUser();
      const all = readLocalOrders();
      if (!currentUser) return [];
      return currentUser.role === "admin"
        ? all
        : all.filter((o) => o.userId === currentUser._id);
    }
  },

  async createOrder(payload: {
    userId: string;
    username: string;
    userEmail: string;
    items: OrderItemRecord[];
    totalAmount: number;
    paymentMethod: PaymentMethodType;
    shippingAddress: ShippingAddressRecord;
  }): Promise<{ order: OrderRecord; updatedProducts: FeaturedShoe[] }> {
    try {
      const res = await httpClient.post<OrderRecord>("/orders", payload);
      const updatedProducts = await this.getProducts();
      return { order: res.data, updatedProducts };
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Checkout failed."));
      }
      const currentProducts = readLocalProducts().map((shoe) => {
        const purchasedQty = payload.items
          .filter((i) => i.shoeId === shoe.id)
          .reduce((sum, i) => sum + i.quantity, 0);
        if (purchasedQty <= 0) return shoe;
        if (shoe.stock < purchasedQty) {
          throw new Error(`Insufficient stock for ${shoe.name}.`);
        }
        return { ...shoe, stock: Math.max(0, shoe.stock - purchasedQty) };
      });
      writeLocalProducts(currentProducts);

      const newOrder: OrderRecord = {
        _id: `ord-${Date.now()}`,
        orderNumber: `SLP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: payload.userId,
        username: payload.username,
        userEmail: payload.userEmail,
        items: payload.items,
        totalAmount: payload.totalAmount,
        paymentMethod: payload.paymentMethod,
        shippingAddress: payload.shippingAddress,
        status: payload.paymentMethod === "COD" ? "Pending" : "Paid",
        createdAt: new Date().toISOString(),
      };
      writeLocalOrders([newOrder, ...readLocalOrders()]);
      return { order: newOrder, updatedProducts: currentProducts };
    }
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatusType
  ): Promise<OrderRecord[]> {
    try {
      await httpClient.put(`/orders/${orderId}`, { status });
      return await this.getOrders();
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to update order status."));
      }
      const next = readLocalOrders().map((o) =>
        o._id === orderId ? { ...o, status } : o
      );
      writeLocalOrders(next);
      return next;
    }
  },

  async deleteOrder(orderId: string): Promise<OrderRecord[]> {
    try {
      await httpClient.delete(`/orders/${orderId}`);
      return await this.getOrders();
    } catch (err) {
      if (!isNetworkFailure(err)) {
        throw new Error(extractErrorMessage(err, "Failed to delete order."));
      }
      const next = readLocalOrders().filter((o) => o._id !== orderId);
      writeLocalOrders(next);
      return next;
    }
  },

  // --- PERSISTENT MONGODB BASKET SYNC ---
  async getBasket(): Promise<BasketItem[] | null> {
    try {
      const res = await httpClient.get<{ items: BasketItem[] }>("/basket");
      return Array.isArray(res.data?.items) ? res.data.items : [];
    } catch (err) {
      if (isNetworkFailure(err)) return null;
      return [];
    }
  },

  async saveBasket(items: BasketItem[]): Promise<BasketItem[] | null> {
    const compact = items.map((item) => ({
      shoeId: item.shoe.id,
      size: item.size,
      quantity: item.quantity,
    }));
    try {
      const res = await httpClient.put<{ items: BasketItem[] }>("/basket", {
        items: compact,
      });
      return Array.isArray(res.data?.items) ? res.data.items : items;
    } catch (err) {
      if (isNetworkFailure(err)) return null;
      return null;
    }
  },

  // --- INFORMATION ASSURANCE AUDIT LOGS (Admin Only) ---
  async getAuditLogs(): Promise<AuditLogRecord[]> {
    try {
      const res = await httpClient.get<AuditLogRecord[]>("/audit-logs");
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },
};

export default httpClient;

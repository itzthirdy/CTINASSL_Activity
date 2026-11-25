import axios from "axios";
import { FEATURED_SHOES } from "../data/shoeCatalog";
import type { FeaturedShoe, ShoeCategory } from "../data/shoeCatalog";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  withCredentials: true,
  timeout: 2200,
});

export interface AppUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: "customer" | "admin";
  likedShoeIds: string[];
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

const LS_USERS_KEY = "sp_mern_users_v1";
const LS_PRODUCTS_KEY = "sp_mern_products_v1";
const LS_ORDERS_KEY = "sp_mern_orders_v1";
const LS_SESSION_KEY = "sp_mern_session_v1";

const DEFAULT_USERS: AppUser[] = [
  {
    _id: "usr-admin-01",
    username: "admin",
    email: "admin@solepurpose.ph",
    password: "admin123",
    role: "admin",
    likedShoeIds: ["ja-4-heat-check-ep"],
    createdAt: "2026-11-01T08:00:00.000Z",
  },
  {
    _id: "usr-cust-01",
    username: "thirdy",
    email: "thirdy@solepurpose.ph",
    password: "sole123",
    role: "customer",
    likedShoeIds: ["ja-4-heat-check-ep", "caitlin-1-ep-royal"],
    createdAt: "2026-11-10T10:30:00.000Z",
  },
];

const DEFAULT_ORDERS: OrderRecord[] = [
  {
    _id: "ord-sample-01",
    orderNumber: "SLP-2026-8410",
    userId: "usr-cust-01",
    username: "thirdy",
    userEmail: "thirdy@solepurpose.ph",
    items: [
      {
        shoeId: "ja-4-heat-check-ep",
        shoeName: "Ja 4 'Heat Check' EP",
        size: "US 9",
        quantity: 1,
        price: 7895,
        imageUrl: "/shoes/nike1.1.avif",
      },
    ],
    totalAmount: 7895,
    paymentMethod: "E-Wallet",
    shippingAddress: {
      fullName: "Thirdy",
      phone: "+63 917 555 0192",
      street: "24 Katipunan Ave, Loyola Heights",
      city: "Quezon City",
      province: "Metro Manila",
      postalCode: "1108",
    },
    status: "Paid",
    createdAt: "2026-11-22T14:20:00.000Z",
  },
];

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
    if (!raw) {
      localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(FEATURED_SHOES));
      return FEATURED_SHOES;
    }
    const parsed = JSON.parse(raw) as FeaturedShoe[];
    // Ensure any newly seeded categories exist
    const existingIds = new Set(parsed.map((p) => p.id));
    let updated = false;
    for (const item of FEATURED_SHOES) {
      if (!existingIds.has(item.id)) {
        parsed.push(item);
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return FEATURED_SHOES;
  }
}

function writeLocalProducts(products: FeaturedShoe[]): void {
  localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(products));
}

function readLocalOrders(): OrderRecord[] {
  try {
    const raw = localStorage.getItem(LS_ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(DEFAULT_ORDERS));
      return DEFAULT_ORDERS;
    }
    return JSON.parse(raw) as OrderRecord[];
  } catch {
    return DEFAULT_ORDERS;
  }
}

function writeLocalOrders(orders: OrderRecord[]): void {
  localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders));
}

export const storeApi = {
  // --- SESSION ---
  getSessionUser(): AppUser | null {
    try {
      const raw = localStorage.getItem(LS_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppUser;
      const latest = readLocalUsers().find((u) => u._id === parsed._id);
      return latest ?? parsed;
    } catch {
      return null;
    }
  },

  setSessionUser(user: AppUser | null): void {
    if (!user) {
      localStorage.removeItem(LS_SESSION_KEY);
    } else {
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify(user));
    }
  },

  // --- AUTH & FORGOT PASSWORD CRUD ---
  async login(username: string, password: string): Promise<AppUser> {
    const cleanUsername = username.trim();
    try {
      const res = await httpClient.post<AppUser>("/auth/login", {
        username: cleanUsername,
        password,
      });
      this.setSessionUser(res.data);
      return res.data;
    } catch {
      const users = readLocalUsers();
      const found = users.find(
        (u) =>
          u.username.toLowerCase() === cleanUsername.toLowerCase() &&
          u.password === password
      );
      if (!found) {
        throw new Error("Invalid username or password.");
      }
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
      const users = readLocalUsers();
      writeLocalUsers([res.data, ...users]);
      this.setSessionUser(res.data);
      return res.data;
    } catch {
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

  async verifyEmailForReset(
    email: string
  ): Promise<{ verified: true; username: string; email: string }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await httpClient.post<{
        verified: true;
        username: string;
        email: string;
      }>("/auth/verify-email", { email: cleanEmail });
      return res.data;
    } catch {
      const users = readLocalUsers();
      const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!found) {
        throw new Error("No account found with that email address.");
      }
      return {
        verified: true,
        username: found.username,
        email: found.email,
      };
    }
  },

  async resetPasswordByEmail(
    email: string,
    newPassword: string
  ): Promise<AppUser> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await httpClient.put<AppUser>("/auth/reset-password", {
        email: cleanEmail,
        newPassword,
      });
      const users = readLocalUsers().map((u) =>
        u.email.toLowerCase() === cleanEmail
          ? { ...u, password: newPassword }
          : u
      );
      writeLocalUsers(users);
      return res.data;
    } catch {
      const users = readLocalUsers();
      const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (idx === -1) {
        throw new Error("Account not found for that email.");
      }
      const updatedUser: AppUser = {
        ...users[idx],
        password: newPassword,
      };
      const nextUsers = [...users];
      nextUsers[idx] = updatedUser;
      writeLocalUsers(nextUsers);
      return updatedUser;
    }
  },

  // --- USERS CRUD ---
  async getUsers(): Promise<AppUser[]> {
    try {
      const res = await httpClient.get<AppUser[]>("/users");
      if (Array.isArray(res.data) && res.data.length > 0) {
        writeLocalUsers(res.data);
        return res.data;
      }
    } catch {
      // Fallback to local mirror
    }
    return readLocalUsers();
  },

  async createUser(data: {
    username: string;
    email: string;
    password: string;
    role: "customer" | "admin";
  }): Promise<AppUser> {
    const newUser: AppUser = {
      _id: `usr-${Date.now()}`,
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: data.role,
      likedShoeIds: [],
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await httpClient.post<AppUser>("/users", newUser);
      const users = readLocalUsers();
      writeLocalUsers([res.data, ...users]);
      return res.data;
    } catch {
      const users = readLocalUsers();
      writeLocalUsers([newUser, ...users]);
      return newUser;
    }
  },

  async updateUser(
    userId: string,
    updates: Partial<Pick<AppUser, "username" | "email" | "password" | "role" | "likedShoeIds">>
  ): Promise<AppUser> {
    const users = readLocalUsers();
    const idx = users.findIndex((u) => u._id === userId);
    const updatedLocal: AppUser =
      idx > -1
        ? { ...users[idx], ...updates }
        : {
            _id: userId,
            username: updates.username ?? "user",
            email: updates.email ?? "user@solepurpose.ph",
            password: updates.password ?? "sole123",
            role: updates.role ?? "customer",
            likedShoeIds: updates.likedShoeIds ?? [],
            createdAt: new Date().toISOString(),
          };

    if (idx > -1) {
      const next = [...users];
      next[idx] = updatedLocal;
      writeLocalUsers(next);
    }

    const currentSession = this.getSessionUser();
    if (currentSession && currentSession._id === userId) {
      this.setSessionUser(updatedLocal);
    }

    try {
      await httpClient.put(`/users/${userId}`, updates);
    } catch {
      // Mirrored locally
    }
    return updatedLocal;
  },

  async deleteUser(userId: string): Promise<void> {
    const next = readLocalUsers().filter((u) => u._id !== userId);
    writeLocalUsers(next);
    try {
      await httpClient.delete(`/users/${userId}`);
    } catch {
      // Mirrored locally
    }
  },

  // --- PRODUCTS & STOCK INVENTORY CRUD ---
  async getProducts(): Promise<FeaturedShoe[]> {
    try {
      const res = await httpClient.get<FeaturedShoe[]>("/products");
      if (Array.isArray(res.data) && res.data.length > 0) {
        writeLocalProducts(res.data);
        return res.data;
      }
    } catch {
      // Fallback to local mirror
    }
    return readLocalProducts();
  },

  async createProduct(input: {
    name: string;
    colorwayName: string;
    category: Exclude<ShoeCategory, "All Shoes">;
    price: number;
    stock: number;
    badge?: string;
    description?: string;
  }): Promise<FeaturedShoe> {
    // Pick studio template assets based on category
    const template =
      input.category === "Running Shoes"
        ? FEATURED_SHOES[2]
        : input.category === "Sandals & Slides"
          ? FEATURED_SHOES[1]
          : FEATURED_SHOES[0];

    const newShoe: FeaturedShoe = {
      ...template,
      id: `shoe-${Date.now()}`,
      sku: `SLP-${Math.floor(1000 + Math.random() * 9000)}`,
      badge: input.badge || "New Release",
      name: input.name.trim(),
      colorwayName: input.colorwayName.trim(),
      category: input.category,
      price: Number(input.price),
      stock: Number(input.stock),
      description:
        input.description?.trim() ||
        "Engineered performance silhouette curated for Sole Purpose Philippines.",
    };

    const products = readLocalProducts();
    writeLocalProducts([...products, newShoe]);

    try {
      await httpClient.post("/products", newShoe);
    } catch {
      // Mirrored locally
    }
    return newShoe;
  },

  async updateProduct(
    shoeId: string,
    updates: Partial<FeaturedShoe>
  ): Promise<FeaturedShoe[]> {
    const products = readLocalProducts().map((item) =>
      item.id === shoeId ? { ...item, ...updates } : item
    );
    writeLocalProducts(products);

    try {
      await httpClient.put(`/products/${shoeId}`, updates);
    } catch {
      // Mirrored locally
    }
    return products;
  },

  async deleteProduct(shoeId: string): Promise<FeaturedShoe[]> {
    const products = readLocalProducts().filter((item) => item.id !== shoeId);
    writeLocalProducts(products);

    try {
      await httpClient.delete(`/products/${shoeId}`);
    } catch {
      // Mirrored locally
    }
    return products;
  },

  // --- ORDERS & CHECKOUT STOCK DEDUCTION CRUD ---
  async getOrders(): Promise<OrderRecord[]> {
    try {
      const res = await httpClient.get<OrderRecord[]>("/orders");
      if (Array.isArray(res.data) && res.data.length > 0) {
        writeLocalOrders(res.data);
        return res.data;
      }
    } catch {
      // Fallback to local mirror
    }
    return readLocalOrders();
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
    const orderNumber = `SLP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: OrderRecord = {
      _id: `ord-${Date.now()}`,
      orderNumber,
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

    // Atomically deduct purchased stock from products
    const currentProducts = readLocalProducts().map((shoe) => {
      const purchasedQty = payload.items
        .filter((i) => i.shoeId === shoe.id)
        .reduce((sum, i) => sum + i.quantity, 0);
      if (purchasedQty <= 0) return shoe;
      return {
        ...shoe,
        stock: Math.max(0, shoe.stock - purchasedQty),
      };
    });
    writeLocalProducts(currentProducts);

    const currentOrders = readLocalOrders();
    writeLocalOrders([newOrder, ...currentOrders]);

    try {
      await httpClient.post("/orders", newOrder);
    } catch {
      // Mirrored locally
    }

    return { order: newOrder, updatedProducts: currentProducts };
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatusType
  ): Promise<OrderRecord[]> {
    const nextOrders = readLocalOrders().map((o) =>
      o._id === orderId ? { ...o, status } : o
    );
    writeLocalOrders(nextOrders);

    try {
      await httpClient.put(`/orders/${orderId}`, { status });
    } catch {
      // Mirrored locally
    }
    return nextOrders;
  },

  async deleteOrder(orderId: string): Promise<OrderRecord[]> {
    const nextOrders = readLocalOrders().filter((o) => o._id !== orderId);
    writeLocalOrders(nextOrders);

    try {
      await httpClient.delete(`/orders/${orderId}`);
    } catch {
      // Mirrored locally
    }
    return nextOrders;
  },
};

export default httpClient;

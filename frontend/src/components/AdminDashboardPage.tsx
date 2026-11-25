import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { animate } from "animejs";
import {
  ArrowLeft,
  Boxes,
  Check,
  Edit3,
  Package,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { formatPHP } from "../data/shoeCatalog";
import type { FeaturedShoe, ShoeCategory } from "../data/shoeCatalog";
import type {
  AppUser,
  OrderRecord,
  OrderStatusType,
} from "../services/api";

interface AdminDashboardPageProps {
  users: AppUser[];
  products: FeaturedShoe[];
  orders: OrderRecord[];
  onBackHome: () => void;
  onCreateUser: (data: {
    username: string;
    email: string;
    password: string;
    role: "customer" | "admin";
  }) => Promise<void>;
  onUpdateUser: (
    userId: string,
    updates: Partial<Pick<AppUser, "username" | "email" | "password" | "role">>
  ) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onCreateProduct: (data: {
    name: string;
    colorwayName: string;
    category: Exclude<ShoeCategory, "All Shoes">;
    price: number;
    stock: number;
    badge: string;
    description: string;
  }) => Promise<void>;
  onUpdateProduct: (
    shoeId: string,
    updates: Partial<FeaturedShoe>
  ) => Promise<void>;
  onDeleteProduct: (shoeId: string) => Promise<void>;
  onUpdateOrderStatus: (
    orderId: string,
    status: OrderStatusType
  ) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
}

type AdminTab = "users" | "orders" | "inventory";

export function AdminDashboardPage({
  users,
  products,
  orders,
  onBackHome,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onDeleteOrder,
}: AdminDashboardPageProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  // User Edit / Create Modal States
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [uUsername, setUUsername] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState<"customer" | "admin">("customer");

  // Product Create / Edit States
  const [isCreatingShoe, setIsCreatingShoe] = useState(false);
  const [editingShoe, setEditingShoe] = useState<FeaturedShoe | null>(null);
  const [sName, setSName] = useState("");
  const [sColorway, setSColorway] = useState("");
  const [sCategory, setSCategory] =
    useState<Exclude<ShoeCategory, "All Shoes">>("Basketball Shoes");
  const [sPrice, setSPrice] = useState("7895");
  const [sStock, setSStock] = useState("12");
  const [sBadge, setSBadge] = useState("New Release");
  const [sDescription, setSDescription] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (panelRef.current) {
      animate(panelRef.current, {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 420,
        ease: "outExpo",
      });
    }
  }, [activeTab]);

  const openEditUserModal = (u: AppUser) => {
    setEditingUser(u);
    setIsCreatingUser(false);
    setUUsername(u.username);
    setUEmail(u.email);
    setUPassword(u.password);
    setURole(u.role);
  };

  const openCreateUserModal = () => {
    setEditingUser(null);
    setIsCreatingUser(true);
    setUUsername("");
    setUEmail("");
    setUPassword("sole123");
    setURole("customer");
  };

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await onUpdateUser(editingUser._id, {
        username: uUsername.trim(),
        email: uEmail.trim().toLowerCase(),
        password: uPassword,
        role: uRole,
      });
      setEditingUser(null);
    } else if (isCreatingUser) {
      await onCreateUser({
        username: uUsername.trim(),
        email: uEmail.trim().toLowerCase(),
        password: uPassword,
        role: uRole,
      });
      setIsCreatingUser(false);
    }
  };

  const openCreateShoeModal = () => {
    setEditingShoe(null);
    setIsCreatingShoe(true);
    setSName("");
    setSColorway("");
    setSCategory("Basketball Shoes");
    setSPrice("6995");
    setSStock("15");
    setSBadge("New Release");
    setSDescription("");
  };

  const openEditShoeModal = (shoe: FeaturedShoe) => {
    setIsCreatingShoe(false);
    setEditingShoe(shoe);
    setSName(shoe.name);
    setSColorway(shoe.colorwayName);
    setSCategory(shoe.category);
    setSPrice(String(shoe.price));
    setSStock(String(shoe.stock));
    setSBadge(shoe.badge);
    setSDescription(shoe.description);
  };

  const handleSaveShoe = async (e: FormEvent) => {
    e.preventDefault();
    if (editingShoe) {
      await onUpdateProduct(editingShoe.id, {
        name: sName.trim(),
        colorwayName: sColorway.trim(),
        category: sCategory,
        price: Number(sPrice),
        stock: Number(sStock),
        badge: sBadge.trim(),
        description: sDescription.trim(),
      });
      setEditingShoe(null);
    } else if (isCreatingShoe) {
      await onCreateProduct({
        name: sName.trim(),
        colorwayName: sColorway.trim(),
        category: sCategory,
        price: Number(sPrice),
        stock: Number(sStock),
        badge: sBadge.trim(),
        description: sDescription.trim(),
      });
      setIsCreatingShoe(false);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#070709] pt-28 pb-20 text-white">
      {/* Ambient Sporty Arena Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-12 left-[10%] h-96 w-96 rounded-full bg-amber-500/15 blur-[130px]" />
        <div className="absolute right-[10%] bottom-10 h-96 w-96 rounded-full bg-purple-600/15 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
        {/* Header & Navigation */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBackHome}
              className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white hover:bg-white hover:text-black"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Storefront</span>
            </button>
            <h1 className="font-sport text-3xl tracking-wide text-white uppercase italic sm:text-4xl">
              SOLE PURPOSE <span className="text-amber-300">ADMIN PANEL</span>
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              MERN Stack Database CRUD Management — User Profiles, Orders &amp;
              Buyers Log, and Shoe Stock Inventory.
            </p>
          </div>

          {/* 3 Tab Switchers */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-black/50 p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition ${
                activeTab === "users"
                  ? "bg-amber-400 text-black shadow"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>1. User Profiles ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition ${
                activeTab === "orders"
                  ? "bg-amber-400 text-black shadow"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>2. Orders &amp; Buyers ({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition ${
                activeTab === "inventory"
                  ? "bg-amber-400 text-black shadow"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Boxes className="h-4 w-4" />
              <span>3. Shoe Stock Inventory ({products.length})</span>
            </button>
          </div>
        </div>

        {/* MAIN CRUD PANEL */}
        <div
          ref={panelRef}
          className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8"
        >
          {/* TAB 1: USER PROFILES CRUD */}
          {activeTab === "users" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-sport text-2xl tracking-wide text-white uppercase italic">
                    USER PROFILES CRUD
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Inspect user accounts, change their username, email,
                    password, or role, or add/delete users.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateUserModal}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold tracking-wider text-black uppercase transition hover:bg-amber-300"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add User (Create)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/15 text-zinc-400 uppercase">
                    <tr>
                      <th className="py-3 pr-4">Username</th>
                      <th className="py-3 pr-4">Email Address</th>
                      <th className="py-3 pr-4">Password</th>
                      <th className="py-3 pr-4">Role</th>
                      <th className="py-3 pr-4">Liked Shoes</th>
                      <th className="py-3 text-right">CRUD Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-white/[0.02]">
                        <td className="py-4 pr-4 font-semibold text-white">
                          @{u.username}
                        </td>
                        <td className="py-4 pr-4 text-zinc-300">{u.email}</td>
                        <td className="font-mono-tabular py-4 pr-4 text-amber-300">
                          {u.password}
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                              u.role === "admin"
                                ? "bg-amber-400/20 text-amber-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="font-mono-tabular py-4 pr-4 text-zinc-400">
                          {u.likedShoeIds?.length ?? 0} saved
                        </td>
                        <td className="py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditUserModal(u)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-amber-400 hover:bg-amber-400 hover:text-black"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteUser(u._id)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS & BUYERS LOG CRUD */}
          {activeTab === "orders" && (
            <div>
              <div className="mb-6">
                <h2 className="font-sport text-2xl tracking-wide text-white uppercase italic">
                  CUSTOMER PURCHASES &amp; ORDERS LOG
                </h2>
                <p className="text-xs text-zinc-400">
                  See who bought which shoes, payment method (COD, E-Wallet,
                  Debit/Credit Card), delivery address, and update delivery
                  status.
                </p>
              </div>

              {orders.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-400">
                  No orders recorded yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div
                      key={ord._id}
                      className="rounded-2xl border border-white/15 bg-black/45 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3.5">
                        <div>
                          <span className="font-mono-tabular text-sm font-bold text-amber-300">
                            {ord.orderNumber}
                          </span>
                          <span className="ml-3 text-xs text-zinc-300">
                            Buyer:{" "}
                            <strong className="text-white">
                              @{ord.username}
                            </strong>{" "}
                            ({ord.userEmail})
                          </span>
                          <span className="ml-3 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-200">
                            {ord.paymentMethod}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <select
                            value={ord.status}
                            onChange={(e) =>
                              onUpdateOrderStatus(
                                ord._id,
                                e.target.value as OrderStatusType
                              )
                            }
                            className="cursor-pointer rounded-xl border border-white/20 bg-[#14161f] px-3 py-1.5 text-xs font-semibold text-emerald-300 focus:outline-none"
                          >
                            <option value="Pending">Status: Pending</option>
                            <option value="Paid">Status: Paid</option>
                            <option value="Shipped">Status: Shipped</option>
                            <option value="Delivered">Status: Delivered</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => onDeleteOrder(ord._id)}
                            className="cursor-pointer rounded-xl border border-red-500/30 bg-red-500/15 p-2 text-red-300 transition hover:bg-red-500 hover:text-white"
                            title="Delete order record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="space-y-2 md:col-span-7">
                          <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                            Shoes Purchased
                          </p>
                          {ord.items.map((item, idx) => (
                            <div
                              key={`${ord._id}-${idx}`}
                              className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={item.imageUrl}
                                  alt={item.shoeName}
                                  className="h-10 w-10 rounded-lg bg-[#F5F5F5] object-contain p-1"
                                />
                                <div>
                                  <p className="font-semibold text-white">
                                    {item.shoeName}
                                  </p>
                                  <p className="text-zinc-400">
                                    Size: {item.size} · Quantity:{" "}
                                    {item.quantity}
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono-tabular font-bold text-white">
                                {formatPHP(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col justify-between rounded-xl bg-white/[0.03] p-3.5 text-xs md:col-span-5">
                          <div>
                            <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                              Delivery Destination
                            </p>
                            <p className="mt-1 font-semibold text-white">
                              {ord.shippingAddress.fullName} (
                              {ord.shippingAddress.phone})
                            </p>
                            <p className="text-zinc-400">
                              {ord.shippingAddress.street},{" "}
                              {ord.shippingAddress.city},{" "}
                              {ord.shippingAddress.province}{" "}
                              {ord.shippingAddress.postalCode}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
                            <span className="text-zinc-400">Order Total</span>
                            <span className="font-mono-tabular text-sm font-bold text-amber-300">
                              {formatPHP(ord.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHOE STOCK & CATALOG INVENTORY CRUD */}
          {activeTab === "inventory" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-sport text-2xl tracking-wide text-white uppercase italic">
                    SHOE STOCK &amp; CATALOG INVENTORY CRUD
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Monitor how many stocks are left per shoe, adjust stock
                    counts or prices, or add/delete shoes across categories.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateShoeModal}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold tracking-wider text-black uppercase transition hover:bg-amber-300"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Shoe (Create)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/15 text-zinc-400 uppercase">
                    <tr>
                      <th className="py-3 pr-4">Shoe</th>
                      <th className="py-3 pr-4">Category</th>
                      <th className="py-3 pr-4">Price (PHP)</th>
                      <th className="py-3 pr-4">Remaining Stock</th>
                      <th className="py-3 text-right">CRUD Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {products.map((shoe) => (
                      <tr key={shoe.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={shoe.angles.lateral}
                              alt={shoe.name}
                              className="h-12 w-12 rounded-xl bg-[#F5F5F5] object-contain p-1"
                            />
                            <div>
                              <p className="font-semibold text-white">
                                {shoe.name}
                              </p>
                              <p className="text-[11px] text-zinc-400">
                                {shoe.sku} · {shoe.colorwayName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-zinc-300">
                          {shoe.category}
                        </td>
                        <td className="font-mono-tabular py-3.5 pr-4 font-bold text-white">
                          {formatPHP(shoe.price)}
                        </td>
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateProduct(shoe.id, {
                                  stock: Math.max(0, shoe.stock - 1),
                                })
                              }
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-white/5 font-bold text-white hover:bg-white/20"
                            >
                              -
                            </button>
                            <span
                              className={`font-mono-tabular min-w-20 rounded-full px-3 py-1 text-center text-xs font-bold ${
                                shoe.stock <= 0
                                  ? "bg-red-500/20 text-red-300"
                                  : shoe.stock <= 3
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-emerald-500/20 text-emerald-300"
                              }`}
                            >
                              {shoe.stock} left
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateProduct(shoe.id, {
                                  stock: shoe.stock + 1,
                                })
                              }
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-white/5 font-bold text-white hover:bg-white/20"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditShoeModal(shoe)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-amber-400 hover:bg-amber-400 hover:text-black"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteProduct(shoe.id)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* USER CREATE / EDIT MODAL */}
      {(editingUser || isCreatingUser) && (
        <div
          onClick={() => {
            setEditingUser(null);
            setIsCreatingUser(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#101118] p-7 text-white shadow-2xl"
          >
            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setIsCreatingUser(false);
              }}
              className="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-sport text-xl uppercase italic">
              {editingUser
                ? `EDIT USER · @${editingUser.username}`
                : "CREATE NEW USER"}
            </h3>

            <form onSubmit={handleSaveUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={uUsername}
                  onChange={(e) => setUUsername(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Password
                </label>
                <input
                  type="text"
                  required
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Role
                </label>
                <select
                  value={uRole}
                  onChange={(e) =>
                    setURole(e.target.value as "customer" | "admin")
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-amber-400 py-3 text-xs font-bold tracking-widest text-black uppercase hover:bg-amber-300"
              >
                <Check className="h-4 w-4" />
                <span>Save User Profile (CRUD)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHOE CREATE / EDIT MODAL */}
      {(editingShoe || isCreatingShoe) && (
        <div
          onClick={() => {
            setEditingShoe(null);
            setIsCreatingShoe(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#101118] p-7 text-white shadow-2xl"
          >
            <button
              type="button"
              onClick={() => {
                setEditingShoe(null);
                setIsCreatingShoe(false);
              }}
              className="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-sport text-xl uppercase italic">
              {editingShoe ? `EDIT SHOE · ${editingShoe.name}` : "ADD NEW SHOE"}
            </h3>

            <form onSubmit={handleSaveShoe} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Shoe Model Name
                </label>
                <input
                  type="text"
                  required
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Colorway Name
                </label>
                <input
                  type="text"
                  required
                  value={sColorway}
                  onChange={(e) => setSColorway(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Category
                  </label>
                  <select
                    value={sCategory}
                    onChange={(e) =>
                      setSCategory(
                        e.target.value as Exclude<ShoeCategory, "All Shoes">
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="Basketball Shoes">Basketball Shoes</option>
                    <option value="Running Shoes">Running Shoes</option>
                    <option value="Sandals & Slides">Sandals &amp; Slides</option>
                    <option value="Lifestyle">Lifestyle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Badge
                  </label>
                  <input
                    type="text"
                    required
                    value={sBadge}
                    onChange={(e) => setSBadge(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Price (PHP ₱)
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={sPrice}
                    onChange={(e) => setSPrice(e.target.value)}
                    className="font-mono-tabular mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Stocks Available
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={sStock}
                    onChange={(e) => setSStock(e.target.value)}
                    className="font-mono-tabular mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={sDescription}
                  onChange={(e) => setSDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-amber-400 py-3 text-xs font-bold tracking-widest text-black uppercase hover:bg-amber-300"
              >
                <Check className="h-4 w-4" />
                <span>Save Shoe Inventory (CRUD)</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { animate, stagger } from "animejs";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  Package,
  User,
} from "lucide-react";
import { formatPHP } from "../data/shoeCatalog";
import type { AppUser, OrderRecord } from "../services/api";
import { resolveAssetUrl } from "../utils/useTransparentCutout";

interface UserAccountPageProps {
  user: AppUser;
  orders: OrderRecord[];
  onBackHome: () => void;
  onUpdateProfile: (
    updates: Partial<Pick<AppUser, "username" | "email" | "password">>
  ) => Promise<void>;
}

export function UserAccountPage({
  user,
  orders,
  onBackHome,
  onUpdateProfile,
}: UserAccountPageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const cards = rootRef.current.querySelectorAll(".account-card");
    animate(cards, {
      opacity: [0, 1],
      translateY: [28, 0],
      delay: stagger(120),
      duration: 650,
      ease: "outExpo",
    });
  }, []);

  const userOrders = orders.filter(
    (o) =>
      o.userId === user._id ||
      o.username.toLowerCase() === user.username.toLowerCase()
  );

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const updates: Partial<Pick<AppUser, "username" | "email" | "password">> = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
    };
    if (password.trim().length >= 6) {
      updates.password = password;
    }
    await onUpdateProfile(updates);
    setPassword("");
    setSavedMsg("Profile updated in database (CRUD Update)!");
    setTimeout(() => setSavedMsg(null), 3000);
  };

  return (
    <section
      ref={rootRef}
      className="relative min-h-screen overflow-hidden bg-[#070709] pt-28 pb-20 text-white"
    >
      {/* Animated Sporty Arena Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-[12%] h-96 w-96 rounded-full bg-amber-500/15 blur-[130px]" />
        <div className="absolute top-1/3 right-[10%] h-96 w-96 rounded-full bg-purple-600/15 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-10">
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
              MEMBER DASHBOARD ·{" "}
              <span className="text-amber-300">@{user.username}</span>
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left: Update Profile & Change Password Card (CRUD Update) */}
          <div className="account-card rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8 lg:col-span-5">
            <h2 className="font-sport text-xl tracking-wide text-white uppercase italic">
              ACCOUNT &amp; PASSWORD SETTINGS
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Update your username, email address, or account password directly
              in the database.
            </p>

            {savedMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-medium text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{savedMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Username
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <User className="h-4 w-4 text-amber-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Email Address
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <Mail className="h-4 w-4 text-amber-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  New Password (optional)
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full cursor-pointer rounded-full bg-white py-3 text-xs font-bold tracking-[0.18em] text-black uppercase transition hover:bg-amber-300"
              >
                Save Changes (CRUD Update)
              </button>
            </form>
          </div>

          {/* Right: My Orders & Purchase History */}
          <div className="account-card rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Package className="h-5 w-5 text-amber-400" />
                <h2 className="font-sport text-xl tracking-wide text-white uppercase italic">
                  MY ORDERS ({userOrders.length})
                </h2>
              </div>
            </div>

            {userOrders.length === 0 ? (
              <div className="mt-12 text-center">
                <p className="text-sm text-zinc-300">
                  You haven&apos;t placed any orders yet.
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Add shoes to your basket and complete checkout to track your
                  orders here.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {userOrders.map((ord) => (
                  <div
                    key={ord._id}
                    className="rounded-2xl border border-white/10 bg-black/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <span className="font-mono-tabular text-xs font-bold text-amber-300">
                          {ord.orderNumber}
                        </span>
                        <span className="ml-2 text-xs text-zinc-400">
                          · {ord.paymentMethod}
                        </span>
                      </div>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold text-emerald-300">
                        {ord.status}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {ord.items.map((item, i) => (
                        <div
                          key={`${ord._id}-${i}`}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={resolveAssetUrl(item.imageUrl)}
                              alt={item.shoeName}
                              className="h-10 w-10 rounded-lg bg-[#F5F5F5] object-contain p-1"
                            />
                            <div>
                              <p className="font-semibold text-white">
                                {item.shoeName}
                              </p>
                              <p className="text-zinc-400">
                                Size: {item.size} × {item.quantity}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono-tabular font-semibold text-white">
                            {formatPHP(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                      <span className="text-zinc-400">
                        Deliver to: {ord.shippingAddress.street},{" "}
                        {ord.shippingAddress.city}
                      </span>
                      <span className="font-mono-tabular text-sm font-bold text-amber-300">
                        Total: {formatPHP(ord.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

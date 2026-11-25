import {
  ChevronDown,
  Heart,
  LogOut,
  Shield,
  ShoppingBasket,
  User,
} from "lucide-react";
import { animate } from "animejs";
import { useEffect, useRef } from "react";
import type { AppUser } from "../services/api";

interface NavbarProps {
  basketCount: number;
  likedCount: number;
  currentUser: AppUser | null;
  onNavigateHome: () => void;
  onNavigateAbout: () => void;
  onNavigateShopNow: () => void;
  onOpenCategories: () => void;
  onOpenLogin: () => void;
  onOpenBasket: () => void;
  onOpenLiked: () => void;
  onNavigateAccount: () => void;
  onNavigateAdmin: () => void;
  onSignOut: () => void;
}

export function Navbar({
  basketCount,
  likedCount,
  currentUser,
  onNavigateHome,
  onNavigateAbout,
  onNavigateShopNow,
  onOpenCategories,
  onOpenLogin,
  onOpenBasket,
  onOpenLiked,
  onNavigateAccount,
  onNavigateAdmin,
  onSignOut,
}: NavbarProps) {
  const badgeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (basketCount > 0 && badgeRef.current) {
      animate(badgeRef.current, {
        scale: [1.45, 1],
        duration: 480,
        ease: "outElastic(1, 0.5)",
      });
    }
  }, [basketCount]);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-[#070709]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        {/* Top Left: Sporty Catchy Brand Title */}
        <button
          type="button"
          onClick={onNavigateHome}
          className="group flex cursor-pointer items-center text-left focus:outline-none"
        >
          <span className="font-sport text-xl tracking-[0.12em] text-white uppercase italic sm:text-2xl">
            SOLE{" "}
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-purple-400 bg-clip-text text-transparent">
              PURPOSE
            </span>
          </span>
        </button>

        {/* Center Navigation: Home, Shoes (Nike Slide-Out Categories), About Us, Shop Now */}
        <nav
          aria-label="Primary Navigation"
          className="hidden items-center gap-8 md:flex"
        >
          <button
            type="button"
            onClick={onNavigateHome}
            className="cursor-pointer text-sm font-medium text-zinc-200 transition-colors hover:text-white"
          >
            Home
          </button>
          <button
            type="button"
            onClick={onOpenCategories}
            className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-zinc-200 transition-colors hover:text-amber-300"
          >
            <span>Shoes</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onNavigateAbout}
            className="cursor-pointer text-sm font-medium text-zinc-300 transition-colors hover:text-white"
          >
            About Us
          </button>
          <button
            type="button"
            onClick={onNavigateShopNow}
            className="relative cursor-pointer text-sm font-medium text-zinc-300 transition-colors hover:text-amber-300"
          >
            Shop Now
          </button>
        </nav>

        {/* Top Right: Distinct Guest vs Signed-In vs Admin Perspective */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {currentUser?.role === "admin" && (
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3.5 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-400 hover:text-black"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin Panel</span>
            </button>
          )}

          {currentUser ? (
            <>
              {/* Signed-In Perspective: Liked Shoes Button */}
              <button
                type="button"
                onClick={onOpenLiked}
                title="View Liked Shoes"
                className="relative flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:border-rose-400/50 hover:text-white"
              >
                <Heart className="h-4 w-4 text-rose-400" />
                <span className="hidden lg:inline">Liked</span>
                {likedCount > 0 && (
                  <span className="font-mono-tabular flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {likedCount}
                  </span>
                )}
              </button>

              {/* Signed-In Perspective: Member Orders & Account Dashboard */}
              <button
                type="button"
                onClick={onNavigateAccount}
                title="My Orders & Profile Settings"
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/35 hover:bg-white/10 hover:text-white sm:text-sm"
              >
                <User className="h-4 w-4 text-amber-400" />
                <span>@{currentUser.username}</span>
              </button>
            </>
          ) : (
            /* Guest Perspective: Sign In Button */
            <button
              type="button"
              onClick={onOpenLogin}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-200 transition-all hover:border-white/35 hover:bg-white/10 hover:text-white sm:text-sm"
            >
              <User className="h-4 w-4 text-amber-400" />
              <span>Sign In</span>
            </button>
          )}

          {/* Basket Button */}
          <button
            type="button"
            onClick={onOpenBasket}
            className="relative flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-[#14151a] px-4 py-2 text-xs font-medium text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] transition-all hover:border-white/35 hover:bg-[#1d1f27] sm:px-5 sm:text-sm"
          >
            <ShoppingBasket className="h-4 w-4 text-zinc-200" />
            <span>Basket</span>
            {basketCount > 0 && (
              <span
                ref={badgeRef}
                className="font-mono-tabular flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-black"
              >
                {basketCount}
              </span>
            )}
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-zinc-400 transition hover:border-red-400/40 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Secondary Nav Bar */}
      <div className="flex items-center justify-center gap-6 border-t border-white/5 bg-[#070709]/95 py-2 md:hidden">
        <button
          type="button"
          onClick={onNavigateHome}
          className="text-xs font-medium text-zinc-200 hover:text-white"
        >
          Home
        </button>
        <button
          type="button"
          onClick={onOpenCategories}
          className="text-xs font-medium text-zinc-200 hover:text-amber-300"
        >
          Shoes ▾
        </button>
        <button
          type="button"
          onClick={onNavigateAbout}
          className="text-xs font-medium text-zinc-300 hover:text-white"
        >
          About Us
        </button>
        <button
          type="button"
          onClick={onNavigateShopNow}
          className="text-xs font-medium text-amber-300 hover:text-amber-200"
        >
          Shop Now
        </button>
      </div>
    </header>
  );
}

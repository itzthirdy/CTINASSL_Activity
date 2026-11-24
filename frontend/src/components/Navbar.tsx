import { ShoppingBasket, User } from "lucide-react";
import { animate } from "animejs";
import { useEffect, useRef } from "react";

interface NavbarProps {
  basketCount: number;
  userName: string | null;
  onNavigateHome: () => void;
  onNavigateAbout: () => void;
  onNavigateShopNow: () => void;
  onOpenLogin: () => void;
  onOpenBasket: () => void;
}

export function Navbar({
  basketCount,
  userName,
  onNavigateHome,
  onNavigateAbout,
  onNavigateShopNow,
  onOpenLogin,
  onOpenBasket,
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
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-[#070709]/80 backdrop-blur-xl">
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

        {/* Center Navigation: Home, About Us, Shop Now (matching reference homepage.webp) */}
        <nav
          aria-label="Primary Navigation"
          className="hidden items-center gap-9 md:flex"
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

        {/* Top Right: Sign In beside Basket */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenLogin}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-200 transition-all hover:border-white/35 hover:bg-white/10 hover:text-white sm:text-sm"
          >
            <User className="h-4 w-4 text-amber-400" />
            <span>{userName ? userName : "Sign In"}</span>
          </button>

          <button
            type="button"
            onClick={onOpenBasket}
            className="relative flex cursor-pointer items-center gap-2.5 rounded-full border border-white/15 bg-[#14151a] px-4 py-2 text-xs font-medium text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] transition-all hover:border-white/35 hover:bg-[#1d1f27] sm:px-5 sm:text-sm"
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
        </div>
      </div>

      {/* Mobile Secondary Nav Bar */}
      <div className="flex items-center justify-center gap-8 border-t border-white/5 bg-[#070709]/95 py-2 md:hidden">
        <button
          type="button"
          onClick={onNavigateHome}
          className="text-xs font-medium text-zinc-200 hover:text-white"
        >
          Home
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

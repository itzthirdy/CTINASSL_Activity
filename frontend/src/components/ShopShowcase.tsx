import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, Search, X } from "lucide-react";
import {
  apply3DPerspectiveTilt,
  playShoeHoverLift,
  playShopEntrance,
  reset3DPerspectiveTilt,
} from "../animations/shoeAnimations";
import { formatPHP, SHOE_CATEGORIES } from "../data/shoeCatalog";
import type { AngleKey, FeaturedShoe, ShoeCategory } from "../data/shoeCatalog";
import {
  preloadShoeCutouts,
  useShoeCutoutUrl,
} from "../utils/useTransparentCutout";

interface ShopShowcaseProps {
  products: FeaturedShoe[];
  activeCategory: ShoeCategory;
  likedShoeIds: string[];
  shopTriggerCount: number;
  onCategoryChange: (cat: ShoeCategory) => void;
  onSelectShoeToBuy: (shoe: FeaturedShoe, initialAngle?: AngleKey) => void;
  onToggleLike: (shoe: FeaturedShoe) => void;
}

type SortOption = "featured" | "price-asc" | "price-desc" | "newest";

function ShoePopCard({
  shoe,
  index,
  isLiked,
  onSelectShoeToBuy,
  onToggleLike,
}: {
  shoe: FeaturedShoe;
  index: number;
  isLiked: boolean;
  onSelectShoeToBuy: (shoe: FeaturedShoe, initialAngle?: AngleKey) => void;
  onToggleLike: (shoe: FeaturedShoe) => void;
}) {
  const cardBoxRef = useRef<HTMLDivElement | null>(null);
  const shoeImgRef = useRef<HTMLImageElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);

  // Shop always displays ONLY the Lateral Profile cutout
  const lateralCutoutSrc = useShoeCutoutUrl(
    shoe.angles.lateral,
    shoe.cutoutSensitivity ?? 50
  );

  const handleMouseEnter = () => {
    playShoeHoverLift(shoeImgRef.current, shoe.animationPreset ?? "studio-float");
  };

  const handleMouseLeave = () => {
    reset3DPerspectiveTilt(
      cardBoxRef.current,
      shoeImgRef.current,
      sheenRef.current
    );
  };

  return (
    <article
      data-shoe-index={index}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelectShoeToBuy(shoe, "lateral")}
      className="nike-pop-card group relative flex cursor-pointer flex-col opacity-0"
    >
      {/* Square Studio Pedestal Box (#F5F5F5) with 3D Perspective Tilt + Specular Sheen */}
      <div
        ref={cardBoxRef}
        onPointerMove={(e) =>
          apply3DPerspectiveTilt(
            cardBoxRef.current,
            shoeImgRef.current,
            sheenRef.current,
            e
          )
        }
        className="relative aspect-[1/1] w-full overflow-hidden rounded-lg bg-[#F5F5F5] transition-[box-shadow,transform] duration-200 ease-out group-hover:shadow-[0_22px_50px_rgba(0,0,0,0.14)]"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Moving specular lighting overlay */}
        <div
          ref={sheenRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300"
        />

        {/* Heart / Like Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(shoe);
          }}
          aria-label="Like shoe"
          className="absolute top-3.5 right-3.5 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#111111] shadow-xs transition hover:scale-110"
        >
          <Heart
            className={`h-4 w-4 ${
              isLiked ? "fill-rose-500 text-rose-500" : "text-zinc-700"
            }`}
          />
        </button>

        {/* Grounded 3D elliptical contact shadow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-7 left-1/2 h-5 w-3/4 -translate-x-1/2 rounded-full bg-black/20 blur-md transition-transform duration-300 group-hover:scale-90 group-hover:opacity-75"
        />

        {/* Lateral Profile Only Shoe Photo */}
        <div className="flex h-full w-full items-center justify-center p-5 sm:p-6">
          <img
            ref={shoeImgRef}
            src={lateralCutoutSrc}
            alt={`${shoe.name} — Lateral Profile`}
            draggable={false}
            className="relative z-10 max-h-full max-w-full scale-[1.06] object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.18)] will-change-transform select-none"
          />
        </div>
      </div>

      {/* Bottom Typography Stack */}
      <div className="pt-3.5 text-left">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold text-[#D33918]">{shoe.badge}</p>
          <span
            className={`font-mono-tabular text-xs font-semibold ${
              shoe.stock <= 0
                ? "text-red-600"
                : shoe.stock <= 3
                  ? "text-amber-600"
                  : "text-emerald-700"
            }`}
          >
            {shoe.stock <= 0 ? "Out of Stock" : `${shoe.stock} stocks left`}
          </span>
        </div>
        <h3 className="mt-0.5 text-[16px] font-semibold text-[#111111] group-hover:underline">
          {shoe.name}
        </h3>
        <p className="text-[15px] text-[#707072]">{shoe.category}</p>
        <p className="font-mono-tabular mt-2 text-[16px] font-semibold text-[#111111]">
          {formatPHP(shoe.price)}
        </p>
      </div>
    </article>
  );
}

export function ShopShowcase({
  products,
  activeCategory,
  likedShoeIds,
  shopTriggerCount,
  onCategoryChange,
  onSelectShoeToBuy,
  onToggleLike,
}: ShopShowcaseProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasPlayedInitialScroll = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [selectedSize, setSelectedSize] = useState<string>("All");
  const [inStockOnly, setInStockOnly] = useState(false);

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      for (const s of p.sizes) set.add(s);
    }
    return Array.from(set);
  }, [products]);

  const filteredShoes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((item) => {
      if (activeCategory !== "All Shoes" && item.category !== activeCategory) {
        return false;
      }
      if (inStockOnly && item.stock <= 0) return false;
      if (selectedSize !== "All" && !item.sizes.includes(selectedSize)) {
        return false;
      }
      if (q) {
        const hay = `${item.name} ${item.sku} ${item.colorwayName} ${item.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === "price-asc") {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price-desc") {
      return [...list].sort((a, b) => b.price - a.price);
    }
    if (sortBy === "newest") {
      return [...list].reverse();
    }
    return list;
  }, [products, activeCategory, searchQuery, sortBy, selectedSize, inStockOnly]);

  // Preload ONLY lateral profile cutouts for the Shop grid
  useEffect(() => {
    for (const shoe of products) {
      preloadShoeCutouts([shoe.angles.lateral], shoe.cutoutSensitivity ?? 50);
    }
  }, [products]);

  const playPopAnimation = useCallback(() => {
    const root = sectionRef.current;
    if (!root) return;
    const cards = root.querySelectorAll<HTMLElement>(".nike-pop-card");
    playShopEntrance(cards);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasPlayedInitialScroll.current) {
            hasPlayedInitialScroll.current = true;
            playPopAnimation();
          }
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [playPopAnimation]);

  useEffect(() => {
    if (shopTriggerCount > 0 || hasPlayedInitialScroll.current) {
      hasPlayedInitialScroll.current = true;
      playPopAnimation();
    }
  }, [
    shopTriggerCount,
    activeCategory,
    filteredShoes.length,
    playPopAnimation,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSortBy("featured");
    setSelectedSize("All");
    setInStockOnly(false);
    onCategoryChange("All Shoes");
  };

  return (
    <section
      ref={sectionRef}
      id="shop-now"
      className="relative bg-white py-20 text-[#111111] sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Section Header + Category Filter Pills */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-center">
          <h2 className="font-sport text-3xl tracking-wide text-[#111111] uppercase italic sm:text-4xl">
            FEATURED RELEASES
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {SHOE_CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCategoryChange(cat.id)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-[#111111] text-white shadow-sm"
                      : "bg-[#F5F5F5] text-[#707072] hover:bg-zinc-200 hover:text-[#111111]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search, Sort, US Size & In-Stock Toolbar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search model, SKU, colorway..."
              className="w-full rounded-full border border-zinc-200 bg-[#F5F5F5] py-2 pr-9 pl-10 text-xs text-[#111111] placeholder-zinc-500 focus:border-[#111111] focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-[#111111]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              aria-label="Filter by US size"
              className="rounded-full border border-zinc-200 bg-[#F5F5F5] px-3.5 py-2 font-medium text-[#111111] focus:border-[#111111] focus:outline-none"
            >
              <option value="All">Size: All</option>
              {availableSizes.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>

            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-[#F5F5F5] px-3.5 py-2 font-medium text-[#111111]">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="accent-[#111111]"
              />
              <span>In Stock</span>
            </label>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort shoes"
              className="rounded-full border border-zinc-200 bg-[#F5F5F5] px-3.5 py-2 font-medium text-[#111111] focus:border-[#111111] focus:outline-none"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Added</option>
            </select>

            <span className="font-mono-tabular text-xs text-zinc-500">
              {filteredShoes.length} pair{filteredShoes.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* 3-Column Lateral-Only Grid */}
        {filteredShoes.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-[#F5F5F5] p-12 text-center">
            <p className="font-sport text-2xl text-[#111111] uppercase italic">
              {products.length === 0
                ? "Catalog Currently Empty"
                : "No Matching Shoes Found"}
            </p>
            <p className="mt-1.5 text-xs text-[#707072]">
              {products.length === 0
                ? "Add new shoes (with Nike lateral photos) in the Admin Panel to display them here."
                : "Try clearing your search or adjusting size/category filters."}
            </p>
            {products.length > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 cursor-pointer rounded-full bg-[#111111] px-6 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
            {filteredShoes.map((shoe, idx) => (
              <ShoePopCard
                key={shoe.id}
                shoe={shoe}
                index={idx}
                isLiked={likedShoeIds.includes(shoe.id)}
                onSelectShoeToBuy={onSelectShoeToBuy}
                onToggleLike={onToggleLike}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

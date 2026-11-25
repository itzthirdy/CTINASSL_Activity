import { useCallback, useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { Heart } from "lucide-react";
import {
  formatPHP,
  SHOE_ANGLE_OPTIONS,
  SHOE_CATEGORIES,
} from "../data/shoeCatalog";
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
  onQuickAddToBasket: (shoe: FeaturedShoe) => void;
  onToggleLike: (shoe: FeaturedShoe) => void;
}

interface ShoePopCardProps {
  shoe: FeaturedShoe;
  index: number;
  isLiked: boolean;
  onSelectShoeToBuy: (shoe: FeaturedShoe, initialAngle?: AngleKey) => void;
  onQuickAddToBasket: (shoe: FeaturedShoe) => void;
  onToggleLike: (shoe: FeaturedShoe) => void;
}

function ShoePopCard({
  shoe,
  index,
  isLiked,
  onSelectShoeToBuy,
  onQuickAddToBasket,
  onToggleLike,
}: ShoePopCardProps) {
  const shoeImgRef = useRef<HTMLImageElement | null>(null);

  const [activeAngle, setActiveAngle] = useState<AngleKey>("lateral");
  const [isHovered, setIsHovered] = useState(false);

  const cutoutSrc = useShoeCutoutUrl(shoe.angles[activeAngle]);

  const animatePlacementChange = (targetAngle: AngleKey, entering: boolean) => {
    setActiveAngle(targetAngle);
    if (shoeImgRef.current) {
      if (entering) {
        animate(shoeImgRef.current, {
          translateY: [14, -10],
          translateX: [-6, 4],
          rotate: [0, -5],
          scale: [0.95, 1.07],
          duration: 520,
          ease: "outBack(1.85)",
        });
      } else {
        animate(shoeImgRef.current, {
          translateY: 0,
          translateX: 0,
          rotate: 0,
          scale: 1,
          duration: 420,
          ease: "outExpo",
        });
      }
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    animatePlacementChange("pairAngle", true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    animatePlacementChange("lateral", false);
  };

  const handleThumbHover = (angleKey: AngleKey) => {
    setActiveAngle(angleKey);
    if (shoeImgRef.current) {
      animate(shoeImgRef.current, {
        translateY: [-4, -12],
        rotate: [-2, -6],
        scale: [1.02, 1.08],
        duration: 360,
        ease: "outBack(1.7)",
      });
    }
  };

  return (
    <article
      data-shoe-index={index}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelectShoeToBuy(shoe, activeAngle)}
      className="nike-pop-card group relative flex cursor-pointer flex-col opacity-0"
    >
      {/* Square Studio Box matching Nike Store & nike.png (#F5F5F5) with HUGE edge-filling shoe */}
      <div className="relative aspect-[1/1] w-full overflow-hidden bg-[#F5F5F5] transition-shadow duration-300 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
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

        {/* Main Huge Shoe Photo */}
        <div className="flex h-full w-full items-center justify-center p-4 pb-10 sm:p-5 sm:pb-12">
          <img
            ref={shoeImgRef}
            src={cutoutSrc}
            alt={`${shoe.name} - ${activeAngle}`}
            draggable={false}
            className="max-h-full max-w-full scale-[1.06] object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.16)] will-change-transform select-none"
          />
        </div>

        {/* Bottom Hover Bar: 6 Multi-Angle Placement Strip + Quick Basket Action */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-3 bottom-3 left-3 z-20 flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white/95 p-2 shadow-md backdrop-blur-md transition-all duration-300 ${
            isHovered
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0"
          }`}
        >
          <div className="flex items-center gap-1 overflow-x-auto">
            {SHOE_ANGLE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onMouseEnter={() => handleThumbHover(opt.key)}
                onClick={() => onSelectShoeToBuy(shoe, opt.key)}
                className={`h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition-all ${
                  activeAngle === opt.key
                    ? "border-[#111111] ring-2 ring-[#111111]/20"
                    : "border-zinc-200 opacity-75 hover:opacity-100"
                }`}
                title={opt.label}
              >
                <img
                  src={shoe.angles[opt.key]}
                  alt={opt.label}
                  className="h-full w-full bg-[#F5F5F5] object-cover"
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={shoe.stock <= 0}
            onClick={() => onQuickAddToBasket(shoe)}
            className="shrink-0 cursor-pointer rounded-lg bg-[#111111] px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {shoe.stock > 0 ? "+ Basket" : "Sold Out"}
          </button>
        </div>
      </div>

      {/* Bottom Typography Stack matching Reference/Shoes/nike.png + Live Stock Count */}
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
            {shoe.stock <= 0
              ? "Out of Stock"
              : `${shoe.stock} stocks left`}
          </span>
        </div>
        <h3 className="mt-0.5 text-[16px] font-semibold text-[#111111] group-hover:underline">
          {shoe.name}
        </h3>
        <p className="text-[15px] text-[#707072]">{shoe.category}</p>
        <p className="mt-2 text-[16px] font-semibold text-[#111111]">
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
  onQuickAddToBasket,
  onToggleLike,
}: ShopShowcaseProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasPlayedInitialScroll = useRef(false);

  const filteredShoes =
    activeCategory === "All Shoes"
      ? products
      : products.filter((item) => item.category === activeCategory);

  useEffect(() => {
    const allUrls: string[] = [];
    for (const shoe of products) {
      allUrls.push(
        shoe.angles.lateral,
        shoe.angles.pairAngle,
        shoe.angles.medial,
        shoe.angles.topDown,
        shoe.angles.outsole,
        shoe.angles.heel
      );
    }
    preloadShoeCutouts(allUrls);
  }, [products]);

  // Anime.js v4 1-by-1 Staggered Pop-Up Sequence
  const playOneByOnePopUp = useCallback(() => {
    const root = sectionRef.current;
    if (!root) return;

    const cards = root.querySelectorAll<HTMLElement>(".nike-pop-card");
    if (!cards.length) return;

    cards.forEach((card) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(80px) scale(0.82)";
    });

    animate(cards, {
      opacity: [0, 1],
      translateY: [80, 0],
      scale: [0.82, 1],
      delay: stagger(200, { start: 80 }),
      duration: 820,
      ease: "outBack(1.65)",
    });
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasPlayedInitialScroll.current) {
            hasPlayedInitialScroll.current = true;
            playOneByOnePopUp();
          }
        }
      },
      { threshold: 0.16 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [playOneByOnePopUp]);

  // Replay 1-by-1 pop-up whenever user clicks "Shop Now" or switches categories
  useEffect(() => {
    if (shopTriggerCount > 0 || hasPlayedInitialScroll.current) {
      hasPlayedInitialScroll.current = true;
      playOneByOnePopUp();
    }
  }, [shopTriggerCount, activeCategory, filteredShoes.length, playOneByOnePopUp]);

  return (
    <section
      ref={sectionRef}
      id="shop-now"
      className="relative bg-white py-20 text-[#111111] sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Section Header + Category Filter Pills */}
        <div className="mb-10 flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-center">
          <h2 className="font-sport text-3xl tracking-wide text-[#111111] uppercase italic sm:text-4xl">
            FEATURED COURT RELEASES
          </h2>

          {/* Category Filter Tabs */}
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

        {/* 3-Column Shoe Grid matching Reference/Shoes/nike.png */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
          {filteredShoes.map((shoe, idx) => (
            <ShoePopCard
              key={shoe.id}
              shoe={shoe}
              index={idx}
              isLiked={likedShoeIds.includes(shoe.id)}
              onSelectShoeToBuy={onSelectShoeToBuy}
              onQuickAddToBasket={onQuickAddToBasket}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

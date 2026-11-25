import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Ruler,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  apply3DPerspectiveTilt,
  playShoeHoverLift,
  playShoePresetAnimation,
  reset3DPerspectiveTilt,
} from "../animations/shoeAnimations";
import {
  buildShoeRoomGradientCss,
  formatPHP,
  getAvailableAngles,
  getModelColorways,
} from "../data/shoeCatalog";
import type { AngleKey, FeaturedShoe } from "../data/shoeCatalog";
import type { AppUser } from "../services/api";
import {
  preloadShoeCutouts,
  useShoeCutoutUrl,
} from "../utils/useTransparentCutout";

interface ProductDetailPageProps {
  shoe: FeaturedShoe;
  allProducts: FeaturedShoe[];
  currentUser: AppUser | null;
  isLiked: boolean;
  initialAngle?: AngleKey;
  onBackToShop: () => void;
  onSelectShoe: (shoe: FeaturedShoe, angle?: AngleKey) => void;
  onAddToBasket: (shoe: FeaturedShoe, size: string) => void;
  onToggleLike: (shoe: FeaturedShoe) => void;
  onAddReview: (
    shoeId: string,
    review: { rating: number; title: string; comment: string; location: string }
  ) => Promise<void>;
  onDeleteReview: (shoeId: string, reviewId: string) => Promise<void>;
}

function RecommendationCard({
  shoe,
  onClick,
}: {
  shoe: FeaturedShoe;
  onClick: () => void;
}) {
  const cardBoxRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);
  const cutoutSrc = useShoeCutoutUrl(
    shoe.angles.lateral,
    shoe.cutoutSensitivity ?? 50
  );

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() =>
        playShoeHoverLift(imgRef.current, shoe.animationPreset ?? "studio-float")
      }
      onMouseLeave={() =>
        reset3DPerspectiveTilt(cardBoxRef.current, imgRef.current, sheenRef.current)
      }
      className="group flex w-full shrink-0 cursor-pointer flex-col text-left focus:outline-none"
    >
      <div
        ref={cardBoxRef}
        onPointerMove={(e) =>
          apply3DPerspectiveTilt(
            cardBoxRef.current,
            imgRef.current,
            sheenRef.current,
            e
          )
        }
        className="relative flex aspect-[1/1] w-full items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5] p-5 transition-shadow duration-300 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)]"
      >
        <div
          ref={sheenRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300"
        />
        <img
          ref={imgRef}
          src={cutoutSrc}
          alt={shoe.name}
          draggable={false}
          className="relative z-10 max-h-full max-w-full scale-[1.06] object-contain drop-shadow-[0_16px_20px_rgba(0,0,0,0.16)] will-change-transform select-none"
        />
      </div>
      <div className="pt-3.5">
        <p className="text-[15px] font-semibold text-[#111111] group-hover:underline">
          {shoe.name}
        </p>
        <p className="text-sm text-[#707072]">
          {shoe.category} · {shoe.colorwayName}
        </p>
        <p className="font-mono-tabular mt-1.5 text-[15px] font-semibold text-[#111111]">
          {formatPHP(shoe.price)}
        </p>
      </div>
    </button>
  );
}

function AngleThumbnailTile({
  shoe,
  angleKey,
  label,
  isSelected,
  onSelect,
}: {
  shoe: FeaturedShoe;
  angleKey: AngleKey;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const thumbSrc = useShoeCutoutUrl(
    shoe.angles[angleKey] ?? "",
    shoe.cutoutSensitivity ?? 50
  );
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onSelect}
      aria-label={label}
      title={label}
      className={`group flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border p-1.5 transition-all sm:h-20 sm:w-20 ${
        isSelected
          ? "border-white bg-white/15 ring-2 ring-white/40"
          : "border-white/15 bg-black/25 opacity-70 hover:border-white/40 hover:opacity-100"
      }`}
    >
      <img
        src={thumbSrc}
        alt={label}
        draggable={false}
        className="max-h-full max-w-full object-contain"
      />
    </button>
  );
}

function ColorwaySwatchTile({
  shoe,
  isActive,
  onClick,
}: {
  shoe: FeaturedShoe;
  isActive: boolean;
  onClick: () => void;
}) {
  const thumbSrc = useShoeCutoutUrl(
    shoe.angles.lateral,
    shoe.cutoutSensitivity ?? 50
  );
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${shoe.name} — ${shoe.colorwayName}`}
      className={`flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-xl border p-1.5 transition-all ${
        isActive
          ? "border-white bg-white/15 ring-2 ring-white/50"
          : "border-white/20 bg-black/25 opacity-75 hover:border-white/50 hover:opacity-100"
      }`}
    >
      <img
        src={thumbSrc}
        alt={shoe.colorwayName}
        className="max-h-full max-w-full object-contain"
      />
    </button>
  );
}

export function ProductDetailPage({
  shoe,
  allProducts,
  currentUser,
  isLiked,
  initialAngle = "lateral",
  onBackToShop,
  onSelectShoe,
  onAddToBasket,
  onToggleLike,
  onAddReview,
  onDeleteReview,
}: ProductDetailPageProps) {
  const stageCardRef = useRef<HTMLDivElement | null>(null);
  const primaryImgRef = useRef<HTMLImageElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);
  const recommendRowRef = useRef<HTMLDivElement | null>(null);

  const availableAngles = getAvailableAngles(shoe);

  const [activeAngleIdx, setActiveAngleIdx] = useState<number>(() => {
    const idx = availableAngles.findIndex((o) => o.key === initialAngle);
    return idx >= 0 ? idx : 0;
  });
  const [selectedSize, setSelectedSize] = useState<string>(
    () => shoe.sizes[2] ?? shoe.sizes[0] ?? "US 9"
  );
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<
    "delivery" | "reviews" | null
  >("delivery");

  // Review Form State
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState("");
  const [revLocation, setRevLocation] = useState("Metro Manila");
  const [revComment, setRevComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const urls = availableAngles
      .map((a) => shoe.angles[a.key])
      .filter((u): u is string => Boolean(u));
    preloadShoeCutouts(urls, shoe.cutoutSensitivity ?? 50);
  }, [shoe, availableAngles]);

  // Trigger shoe entrance preset when arriving at Product Detail
  useEffect(() => {
    playShoePresetAnimation(
      primaryImgRef.current,
      shoe.animationPreset ?? "studio-float"
    );
  }, [shoe.id, shoe.animationPreset]);

  const primaryAngleOption =
    availableAngles[activeAngleIdx % availableAngles.length] ??
    availableAngles[0];
  const secondaryAngleOption =
    availableAngles[(activeAngleIdx + 1) % availableAngles.length] ??
    availableAngles[0];

  const primaryCutoutSrc = useShoeCutoutUrl(
    shoe.angles[primaryAngleOption.key] ?? shoe.angles.lateral,
    shoe.cutoutSensitivity ?? 50
  );
  const secondaryCutoutSrc = useShoeCutoutUrl(
    shoe.angles[secondaryAngleOption.key] ?? shoe.angles.lateral,
    shoe.cutoutSensitivity ?? 50
  );

  const switchAngleIndex = (nextIdx: number) => {
    const wrapped =
      ((nextIdx % availableAngles.length) + availableAngles.length) %
      availableAngles.length;
    setActiveAngleIdx(wrapped);
    playShoePresetAnimation(
      primaryImgRef.current,
      shoe.animationPreset ?? "studio-float"
    );
  };

  const handleAdd = () => {
    onAddToBasket(shoe, selectedSize);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1600);
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!revTitle.trim() || !revComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      await onAddReview(shoe.id, {
        rating: revRating,
        title: revTitle.trim(),
        comment: revComment.trim(),
        location: revLocation.trim() || "Philippines",
      });
      setRevTitle("");
      setRevComment("");
      setRevRating(5);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const reviews = shoe.reviews ?? [];
  const sameModelColorways = getModelColorways(shoe, allProducts);
  const colorwayIds = new Set(sameModelColorways.map((c) => c.id));
  const otherShoes = allProducts.filter((s) => !colorwayIds.has(s.id));

  const scrollRecommendations = (dir: -1 | 1) => {
    recommendRowRef.current?.scrollBy({ left: dir * 420, behavior: "smooth" });
  };

  const roomBackground = buildShoeRoomGradientCss(shoe.roomRgb);

  return (
    <div className="min-h-screen w-full">
      <section
        className="relative overflow-hidden pt-28 pb-16 text-white transition-[background-image] duration-700 md:pt-28 md:pb-20"
        style={{ backgroundImage: roomBackground }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 left-0 h-80 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 1.1px, transparent 1.7px)",
            backgroundSize: "42px 38px",
            maskImage: "linear-gradient(to bottom, black 25%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 25%, transparent 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBackToShop}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-black/35 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:border-white hover:bg-white hover:text-black"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home &amp; Releases</span>
            </button>

            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs text-white/75"
            >
              <button
                type="button"
                onClick={onBackToShop}
                className="cursor-pointer hover:text-white hover:underline"
              >
                Home
              </button>
              <span>/</span>
              <span>{shoe.category}</span>
              <span>/</span>
              <span className="font-semibold text-white">{shoe.name}</span>
            </nav>
          </div>

          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
            {/* LEFT COLUMN: All Uploaded Angles + 3D Tilt */}
            <div className="flex flex-col-reverse gap-4 sm:flex-row lg:sticky lg:top-24 lg:col-span-7">
              <div className="flex flex-row gap-2.5 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
                {availableAngles.map((opt, idx) => (
                  <AngleThumbnailTile
                    key={opt.key}
                    shoe={shoe}
                    angleKey={opt.key}
                    label={opt.label}
                    isSelected={activeAngleIdx === idx}
                    onSelect={() => switchAngleIndex(idx)}
                  />
                ))}
              </div>

              <div className="relative flex-1">
                <div
                  ref={stageCardRef}
                  onPointerMove={(e) =>
                    apply3DPerspectiveTilt(
                      stageCardRef.current,
                      primaryImgRef.current,
                      sheenRef.current,
                      e
                    )
                  }
                  onPointerLeave={() =>
                    reset3DPerspectiveTilt(
                      stageCardRef.current,
                      primaryImgRef.current,
                      sheenRef.current
                    )
                  }
                  className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/25 p-6 backdrop-blur-sm transition-transform duration-200 ease-out sm:min-h-[490px]"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div
                    ref={sheenRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300"
                  />

                  <div
                    className="pointer-events-none absolute bottom-12 h-28 w-3/4 rounded-full opacity-55 blur-3xl"
                    style={{
                      background: `radial-gradient(ellipse, rgba(${shoe.glowRgb}, 0.7) 0%, transparent 72%)`,
                    }}
                  />

                  <img
                    ref={primaryImgRef}
                    src={primaryCutoutSrc}
                    alt={`${shoe.name} — ${primaryAngleOption.label}`}
                    draggable={false}
                    className="relative z-10 max-h-[370px] w-full max-w-[580px] object-contain drop-shadow-[0_26px_32px_rgba(0,0,0,0.65)] will-change-transform select-none sm:max-h-[420px]"
                  />

                  <div className="relative z-20 mt-4 flex w-full items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      {availableAngles.map((opt, idx) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => switchAngleIndex(idx)}
                          aria-label={`View ${opt.label}`}
                          className={`h-1.5 cursor-pointer rounded-full transition-all ${
                            activeAngleIdx === idx
                              ? "w-6 bg-white"
                              : "w-1.5 bg-white/40 hover:bg-white/75"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-xs font-medium text-white/80">
                        {primaryAngleOption.label}
                      </span>
                    </div>

                    {availableAngles.length > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => switchAngleIndex(activeAngleIdx - 1)}
                          aria-label="Previous angle"
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-[#111111] shadow-lg transition hover:scale-105 hover:bg-amber-300"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => switchAngleIndex(activeAngleIdx + 1)}
                          aria-label="Next angle"
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-[#111111] shadow-lg transition hover:scale-105 hover:bg-amber-300"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => switchAngleIndex(activeAngleIdx + 1)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 bg-black/25 p-3 text-left backdrop-blur-sm transition hover:border-white/40 hover:bg-black/35"
                  >
                    <img
                      src={secondaryCutoutSrc}
                      alt={secondaryAngleOption.label}
                      className="h-14 w-20 object-contain"
                    />
                    <div>
                      <p className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
                        Next Angle
                      </p>
                      <p className="text-xs font-semibold text-white">
                        {secondaryAngleOption.label}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center justify-between rounded-xl border border-white/15 bg-black/25 px-4 py-3 backdrop-blur-sm">
                    <div>
                      <p className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
                        Inventory Status
                      </p>
                      <p className="font-mono-tabular text-xs font-semibold text-amber-300">
                        {shoe.stock > 0
                          ? `${shoe.stock} Pairs in Stock`
                          : "Currently Out of Stock"}
                      </p>
                    </div>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: shoe.accentHex }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Specs, Sizes, CTAs & Reviews CRUD */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-white/15 bg-black/30 p-6 backdrop-blur-xl sm:p-8">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-amber-300">
                    {shoe.badge}
                  </span>
                  <span className="font-mono-tabular text-xs text-white/65">
                    {shoe.sku}
                  </span>
                </div>

                <h1 className="font-sport mt-3 text-3xl tracking-wide text-white uppercase italic sm:text-4xl">
                  {shoe.name}
                </h1>
                <p className="mt-1 text-base text-white/75">{shoe.category}</p>

                <div className="mt-4 flex items-baseline justify-between">
                  <p className="font-mono-tabular text-2xl font-bold text-white">
                    {formatPHP(shoe.price)}
                  </p>
                  <span
                    className={`font-mono-tabular rounded-full px-3 py-1 text-xs font-semibold ${
                      shoe.stock <= 0
                        ? "bg-red-500/20 text-red-200"
                        : shoe.stock <= 3
                          ? "bg-amber-500/20 text-amber-200"
                          : "bg-emerald-500/20 text-emerald-200"
                    }`}
                  >
                    {shoe.stock <= 0
                      ? "Out of Stock"
                      : `${shoe.stock} stocks left`}
                  </span>
                </div>

                {sameModelColorways.length > 1 && (
                  <div className="mt-6">
                    <p className="mb-2.5 text-xs font-medium text-white/80">
                      Select Colorway:{" "}
                      <span className="font-semibold text-white">
                        {shoe.colorwayName}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {sameModelColorways.map((item) => (
                        <ColorwaySwatchTile
                          key={item.id}
                          shoe={item}
                          isActive={item.id === shoe.id}
                          onClick={() =>
                            onSelectShoe(item, primaryAngleOption.key)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-7">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      Select Size
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-white/80 transition hover:text-white hover:underline"
                    >
                      <Ruler className="h-3.5 w-3.5" />
                      <span>Size Guide</span>
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {shoe.sizes.map((size) => {
                      const active = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`font-mono-tabular cursor-pointer rounded-xl border py-3 text-xs font-semibold transition ${
                            active
                              ? "border-white bg-white text-[#111111] shadow-md"
                              : "border-white/20 bg-black/25 text-white hover:border-white/70 hover:bg-white/10"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  <button
                    type="button"
                    disabled={shoe.stock <= 0}
                    onClick={handleAdd}
                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-4 text-sm font-bold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      addedFeedback
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-[#111111] hover:bg-amber-300"
                    }`}
                  >
                    {shoe.stock <= 0 ? (
                      <span>Out of Stock</span>
                    ) : addedFeedback ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Added {selectedSize} to Basket</span>
                      </>
                    ) : (
                      <span>Add to Basket</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleLike(shoe)}
                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border py-3.5 text-sm font-semibold transition ${
                      isLiked
                        ? "border-rose-400 bg-rose-500/20 text-rose-200"
                        : "border-white/30 bg-transparent text-white hover:border-white"
                    }`}
                  >
                    <span>{isLiked ? "Saved in Liked Shoes" : "Favourite"}</span>
                    <Heart
                      className={`h-4 w-4 ${
                        isLiked ? "fill-rose-400 text-rose-400" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-7 border-t border-white/15 pt-6">
                  <p className="text-justify text-sm leading-relaxed text-zinc-200">
                    {shoe.description}
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-zinc-200">
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white" />
                      <span>Colour Shown: {shoe.colorwayName}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white" />
                      <span>Style: {shoe.sku}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white" />
                      <span>Category: {shoe.category}</span>
                    </li>
                  </ul>
                </div>

                {/* Accordions: Delivery & Customer Reviews CRUD */}
                <div className="mt-6 divide-y divide-white/15 border-t border-white/15">
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenAccordion((prev) =>
                          prev === "delivery" ? null : "delivery"
                        )
                      }
                      className="flex w-full cursor-pointer items-center justify-between py-4 text-left text-base font-medium text-white"
                    >
                      <span>Free Delivery and Returns</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          openAccordion === "delivery" ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {openAccordion === "delivery" && (
                      <div className="pb-4 text-xs leading-relaxed text-zinc-300">
                        Free standard double-boxed delivery across Metro Manila
                        on orders ₱4,500 and above. Supports Cash on Delivery
                        (COD), E-Wallet QR (GCash/Maya), and Debit/Credit Card.
                      </div>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenAccordion((prev) =>
                          prev === "reviews" ? null : "reviews"
                        )
                      }
                      className="flex w-full cursor-pointer items-center justify-between py-4 text-left text-base font-medium text-white"
                    >
                      <span>Reviews ({reviews.length})</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 text-amber-300">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            openAccordion === "reviews" ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {openAccordion === "reviews" && (
                      <div className="space-y-4 pb-4">
                        {reviews.length === 0 ? (
                          <p className="text-xs text-zinc-400">
                            No verified buyer reviews yet. Be the first to review!
                          </p>
                        ) : (
                          reviews.map((rev) => {
                            const canDelete =
                              currentUser &&
                              (currentUser.role === "admin" ||
                                rev.userId === currentUser._id);
                            return (
                              <div
                                key={rev.id}
                                className="rounded-xl border border-white/10 bg-white/[0.05] p-3.5"
                              >
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span className="font-semibold text-white">
                                    {rev.title}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white/50">
                                      {rev.date}
                                    </span>
                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void onDeleteReview(shoe.id, rev.id)
                                        }
                                        title="Delete review"
                                        className="cursor-pointer text-zinc-400 hover:text-red-400"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-1 flex items-center gap-0.5 text-amber-300">
                                  {Array.from({ length: rev.rating }).map(
                                    (_, idx) => (
                                      <Star
                                        key={idx}
                                        className="h-3 w-3 fill-current"
                                      />
                                    )
                                  )}
                                </div>
                                <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                                  {rev.comment}
                                </p>
                                <p className="mt-2 text-[11px] text-amber-300">
                                  {rev.author} · {rev.location}
                                </p>
                              </div>
                            );
                          })
                        )}

                        {currentUser && (
                          <form
                            onSubmit={handleReviewSubmit}
                            className="space-y-2.5 rounded-xl border border-white/15 bg-black/35 p-3.5 text-xs"
                          >
                            <p className="font-semibold text-white">
                              Write a Review
                            </p>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRevRating(star)}
                                  className="cursor-pointer p-0.5 text-amber-300"
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      star <= revRating
                                        ? "fill-amber-300"
                                        : "text-zinc-500"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                required
                                value={revTitle}
                                onChange={(e) => setRevTitle(e.target.value)}
                                placeholder="Headline"
                                className="rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-white focus:outline-none"
                              />
                              <input
                                type="text"
                                value={revLocation}
                                onChange={(e) => setRevLocation(e.target.value)}
                                placeholder="City (e.g. QC)"
                                className="rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-white focus:outline-none"
                              />
                            </div>
                            <textarea
                              rows={2}
                              required
                              value={revComment}
                              onChange={(e) => setRevComment(e.target.value)}
                              placeholder="How is the fit, traction, and cushion?"
                              className="w-full rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-white focus:outline-none"
                            />
                            <button
                              type="submit"
                              disabled={isSubmittingReview}
                              className="w-full cursor-pointer rounded-full bg-amber-400 py-2 font-bold text-black uppercase hover:bg-amber-300 disabled:opacity-50"
                            >
                              {isSubmittingReview
                                ? "Submitting..."
                                : "Post Review"}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {otherShoes.length > 0 && (
        <section className="border-t border-zinc-200 bg-white py-16 text-[#111111]">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-medium tracking-tight text-[#111111] sm:text-3xl">
                You Might Also Like
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollRecommendations(-1)}
                  aria-label="Scroll recommendations left"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#F5F5F5] text-[#111111] transition hover:bg-zinc-200"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRecommendations(1)}
                  aria-label="Scroll recommendations right"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#F5F5F5] text-[#111111] transition hover:bg-zinc-200"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div
              ref={recommendRowRef}
              className="grid grid-flow-col auto-cols-[80%] gap-4 overflow-x-auto pb-4 sm:auto-cols-[46%] md:auto-cols-[32%]"
            >
              {otherShoes.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  shoe={rec}
                  onClick={() => onSelectShoe(rec, "lateral")}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {isSizeGuideOpen && (
        <div
          onClick={() => setIsSizeGuideOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 text-[#111111] shadow-2xl sm:p-8"
          >
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(false)}
              className="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="font-sport text-xl uppercase italic">
              Sole Purpose Size Chart
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Engineered Performance (EP) pairs feature a slightly roomier
              forefoot fit for Philippine courts.
            </p>
            <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
              <table className="font-mono-tabular w-full text-left text-xs">
                <thead className="bg-zinc-100 text-zinc-700">
                  <tr>
                    <th className="px-4 py-2.5">US</th>
                    <th className="px-4 py-2.5">UK</th>
                    <th className="px-4 py-2.5">EU</th>
                    <th className="px-4 py-2.5">CM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {[
                    ["US 7", "6", "40", "25.0"],
                    ["US 8", "7", "41", "26.0"],
                    ["US 8.5", "7.5", "42", "26.5"],
                    ["US 9", "8", "42.5", "27.0"],
                    ["US 9.5", "8.5", "43", "27.5"],
                    ["US 10", "9", "44", "28.0"],
                    ["US 11", "10", "45", "29.0"],
                    ["US 12", "11", "46", "30.0"],
                  ].map(([us, uk, eu, cm]) => (
                    <tr key={us}>
                      <td className="px-4 py-2 font-semibold">{us}</td>
                      <td className="px-4 py-2">{uk}</td>
                      <td className="px-4 py-2">{eu}</td>
                      <td className="px-4 py-2">{cm} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

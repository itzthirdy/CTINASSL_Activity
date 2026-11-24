import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { FEATURED_SHOES, ROOM_GRADIENT_STOPS } from "../data/shoeCatalog";
import type { FeaturedShoe } from "../data/shoeCatalog";
import { buildShoeCarouselTexture } from "../utils/useTransparentCutout";
import type { ShoeCarouselTexture } from "../utils/useTransparentCutout";

interface HeroCylinderStageProps {
  onShopNowClick: () => void;
  onSelectShoeToBuy: (shoe: FeaturedShoe) => void;
}

/**
 * HalvenMotos Section 14: cubic-bezier(0.51, 0, 0, 0.98) evaluated by 24-iteration bisection
 */
function sampleBezier(
  t: number,
  p1: number,
  p2: number
): number {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}

function easeHalven(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) * 0.5;
    if (sampleBezier(mid, 0.51, 0.0) < x) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return sampleBezier((lo + hi) * 0.5, 0.0, 0.98);
}

/**
 * Inverse of easeHalven(x): given eased value y in [0, 1], finds normalized time x in [0, 1]
 * so drag release joins the active curve with zero jump (HalvenMotos Section 14 & 17.5).
 */
function inverseEaseHalven(y: number): number {
  if (y <= 0) return 0;
  if (y >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) * 0.5;
    if (easeHalven(mid) < y) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) * 0.5;
}

interface LayoutGeometry {
  W: number;
  H: number;
  wordTop: number;
  capHeight: number;
  shoeCenterX: number;
  shoeCenterY: number;
  shoeWidth: number;
  groundY: number;
  step: number;
  arrowLeftX: number;
  arrowRightX: number;
  arrowY: number;
  arrowDiameter: number;
}

function computeHeroGeometry(W: number, H: number): LayoutGeometry {
  const ratio = W / Math.max(1, H);
  const isTall = ratio < 1.15;

  if (isTall) {
    const shoeWidth = Math.min(W * 0.86, 680);
    const shoeCenterX = W * 0.5;
    const shoeCenterY = H * 0.48;
    const groundY = shoeCenterY + shoeWidth * 0.25;
    const wordTop = Math.max(88, shoeCenterY - shoeWidth * 0.36);
    const capHeight = shoeWidth * 0.22;
    const step = W * 0.48 + (shoeWidth * 0.596774) * 0.5;
    const arrowDiameter = W >= 580 ? 44 : 38;
    return {
      W,
      H,
      wordTop,
      capHeight,
      shoeCenterX,
      shoeCenterY,
      shoeWidth,
      groundY,
      step,
      arrowLeftX: Math.max(32, W * 0.12),
      arrowRightX: Math.min(W - 32, W * 0.88),
      arrowY: shoeCenterY,
      arrowDiameter,
    };
  }

  // Wide & Short tiers scaled from 1440 x 810 design frame (HalvenMotos Section 5)
  const u = Math.min(W / 1440, H / 810);
  const ox = W * 0.5 - 720 * u;
  const oy = (H - 810 * u) * 0.5;

  const wordTop = oy + 150 * u;
  const capHeight = 198.5 * u;
  const shoeCenterX = ox + 720 * u;
  const shoeCenterY = oy + 415 * u;
  const shoeWidth = 740 * u;
  const groundY = oy + 610 * u;
  const step = 760 * u;
  const arrowDiameter = Math.max(32, 38 * u);

  return {
    W,
    H,
    wordTop,
    capHeight,
    shoeCenterX,
    shoeCenterY,
    shoeWidth,
    groundY,
    step,
    arrowLeftX: ox + 229 * u,
    arrowRightX: ox + 1211 * u,
    arrowY: oy + 420 * u,
    arrowDiameter,
  };
}

export function HeroCylinderStage({
  onShopNowClick,
  onSelectShoeToBuy,
}: HeroCylinderStageProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const dotGridRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevBtnRef = useRef<HTMLButtonElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);

  const texturesRef = useRef<(ShoeCarouselTexture | null)[]>([
    null,
    null,
    null,
  ]);
  const geomRef = useRef<LayoutGeometry>(computeHeroGeometry(1440, 810));

  // Single progress number pos drives position, scale, rise, blur, shadow, and background color (HalvenMotos Section 13)
  const posRef = useRef<number>(0);
  const moveRef = useRef<{
    active: boolean;
    from: number;
    to: number;
    startTime: number;
  }>({ active: false, from: 0, to: 0, startTime: 0 });
  const queuedStepRef = useRef<number>(0);
  const autoplayTimerRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const dragRef = useRef<{
    pointerId: number | null;
    downX: number;
    downY: number;
    startPos: number;
    active: boolean;
    interruptedDest: number | null;
    trail: { x: number; t: number }[];
  }>({
    pointerId: null,
    downX: 0,
    downY: 0,
    startPos: 0,
    active: false,
    interruptedDest: null,
    trail: [],
  });

  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const slideCount = FEATURED_SHOES.length; // 3 shoes

  const modSlide = (n: number): number =>
    ((Math.round(n) % slideCount) + slideCount) % slideCount;

  // Rewrite the 12-stop vertical room background gradient & draw the carousel canvas at `pos`
  const renderFrameAtPos = (pos: number) => {
    const heroEl = heroRef.current;
    const canvas = canvasRef.current;
    if (!heroEl || !canvas) return;

    const geom = geomRef.current;
    const { W, H, wordTop, capHeight, shoeCenterX, shoeCenterY, shoeWidth, groundY, step } =
      geom;

    // 1. Interpolate room background color between floor(pos) and floor(pos) + 1 (HalvenMotos Section 7)
    const floorIdx = Math.floor(pos);
    const frac = pos - floorIdx;
    const s0 = ((floorIdx % slideCount) + slideCount) % slideCount;
    const s1 = (((floorIdx + 1) % slideCount) + slideCount) % slideCount;
    const c0 = FEATURED_SHOES[s0].roomRgb;
    const c1 = FEATURED_SHOES[s1].roomRgb;

    const baseR = c0[0] + (c1[0] - c0[0]) * frac;
    const baseG = c0[1] + (c1[1] - c0[1]) * frac;
    const baseB = c0[2] + (c1[2] - c0[2]) * frac;

    const mapRowToPx = (row: number): number => {
      let yPx = 0;
      if (row <= 159) {
        yPx = (row / 159) * wordTop;
      } else if (row <= 628) {
        yPx = wordTop + ((row - 159) / (628 - 159)) * (groundY - wordTop);
      } else {
        yPx = groundY + ((row - 628) / (810 - 628)) * (H - groundY);
      }
      return Math.max(0, Math.min(H, yPx));
    };

    const stopStrings = ROOM_GRADIENT_STOPS.map(([row, amount]) => {
      let r: number;
      let g: number;
      let b: number;
      if (amount < 0) {
        const factor = 1 + amount;
        r = Math.round(baseR * factor);
        g = Math.round(baseG * factor);
        b = Math.round(baseB * factor);
      } else {
        r = Math.round(baseR + (255 - baseR) * amount);
        g = Math.round(baseG + (255 - baseG) * amount);
        b = Math.round(baseB + (255 - baseB) * amount);
      }
      const px = Math.round(mapRowToPx(row));
      return `rgb(${r},${g},${b}) ${px}px`;
    });

    heroEl.style.backgroundImage = `linear-gradient(180deg, ${stopStrings.join(", ")})`;

    // Update dot grid height & tile alignment (HalvenMotos Section 7)
    if (dotGridRef.current) {
      const s = shoeWidth / 762;
      const tileW = Math.max(22, 45.4 * s);
      const tileH = Math.max(20, 41 * s);
      const bgPosX = ((W * 0.5 - tileW * 0.5) % tileW + tileW) % tileW;
      const bgPosY = 31 * s - tileH * 0.5;
      dotGridRef.current.style.height = `${Math.round(wordTop + 0.75 * capHeight)}px`;
      dotGridRef.current.style.backgroundSize = `${tileW.toFixed(1)}px ${tileH.toFixed(1)}px`;
      dotGridRef.current.style.backgroundPosition = `${bgPosX.toFixed(1)}px ${bgPosY.toFixed(1)}px`;
    }

    // Update stationary arrow button positions
    if (prevBtnRef.current) {
      prevBtnRef.current.style.left = `${geom.arrowLeftX}px`;
      prevBtnRef.current.style.top = `${geom.arrowY}px`;
      prevBtnRef.current.style.width = `${geom.arrowDiameter}px`;
      prevBtnRef.current.style.height = `${geom.arrowDiameter}px`;
    }
    if (nextBtnRef.current) {
      nextBtnRef.current.style.left = `${geom.arrowRightX}px`;
      nextBtnRef.current.style.top = `${geom.arrowY}px`;
      nextBtnRef.current.style.width = `${geom.arrowDiameter}px`;
      nextBtnRef.current.style.height = `${geom.arrowDiameter}px`;
    }

    // 2. Render shoes on high-DPI canvas sorted farthest-to-nearest from centre (HalvenMotos Section 12 & 13)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(W * dpr);
    const targetH = Math.round(H * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const nearest = Math.round(pos);
    const reach = Math.ceil((W * 0.5 + 0.4 * shoeWidth) / Math.max(1, step)) + 1;
    const indices: number[] = [];
    for (let i = nearest - reach; i <= nearest + reach; i++) {
      indices.push(i);
    }

    // Sort farthest from pos first so the center shoe always renders on top
    indices.sort((a, b) => Math.abs(b - pos) - Math.abs(a - pos));

    for (const i of indices) {
      const slideIdx = ((i % slideCount) + slideCount) % slideCount;
      const tex = texturesRef.current[slideIdx];
      if (!tex) continue;

      const o = i - pos;
      const t = Math.min(1, Math.abs(o));
      // HalvenMotos Section 13: side scale = 740 / 1240 = 0.596774
      const scale = 1 + (0.596774 - 1) * t;
      const cx = shoeCenterX + o * step;
      const q = (shoeWidth * scale) / 1780;

      const quadW = 2048 * q;
      const quadH = 1024 * q;
      const quadLeft = cx - 1024 * q;
      // Shared scaling centre y = 490.5 makes shrinking shoes rise and growing shoes drop to ground line
      const quadTop = shoeCenterY - 490.5 * q;

      // Cull quads more than 20px off screen
      if (quadLeft + quadW < -20 || quadLeft > W + 20) continue;

      // When t <= 0.02 (center shoe at rest), draw 100% razor-sharp native texture with zero blur
      if (t <= 0.02) {
        ctx.globalAlpha = 1;
        ctx.drawImage(tex.sharpCanvas, quadLeft, quadTop, quadW, quadH);
      } else {
        // Smoothly cross-blend sharp texture and pre-blurred depth-of-field texture by t
        if (t < 0.98) {
          ctx.globalAlpha = 1 - t;
          ctx.drawImage(tex.sharpCanvas, quadLeft, quadTop, quadW, quadH);
        }
        ctx.globalAlpha = t * 0.88;
        ctx.drawImage(tex.blurredCanvas, quadLeft, quadTop, quadW, quadH);
      }
    }

    ctx.restore();

    const currentCentered = modSlide(pos);
    setActiveSlideIdx((prev) =>
      prev !== currentCentered ? currentCentered : prev
    );
  };

  // Clear and reschedule the 2000ms autoplay timer (HalvenMotos Section 15)
  const clearAutoplay = () => {
    if (autoplayTimerRef.current !== null) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  };

  const scheduleAutoplay = (delayMs = 2000) => {
    clearAutoplay();
    if (
      moveRef.current.active ||
      dragRef.current.pointerId !== null ||
      document.hidden ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    autoplayTimerRef.current = window.setTimeout(() => {
      startMoveTo(Math.round(posRef.current) + 1);
    }, delayMs);
  };

  // Start a 1400ms transition on cubic-bezier(0.51, 0, 0, 0.98) (HalvenMotos Section 14)
  const startMoveTo = (
    targetPos: number,
    customStartTime?: number,
    customFromPos?: number
  ) => {
    clearAutoplay();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      posRef.current = targetPos;
      moveRef.current.active = false;
      renderFrameAtPos(targetPos);
      return;
    }

    moveRef.current = {
      active: true,
      from: customFromPos !== undefined ? customFromPos : posRef.current,
      to: targetPos,
      startTime: customStartTime !== undefined ? customStartTime : performance.now(),
    };

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    const tick = (now: number) => {
      if (!moveRef.current.active) return;
      const elapsed = now - moveRef.current.startTime;
      const x = Math.max(0, Math.min(1, elapsed / 1400));
      const eased = easeHalven(x);
      const nextPos =
        moveRef.current.from +
        (moveRef.current.to - moveRef.current.from) * eased;

      posRef.current = nextPos;
      renderFrameAtPos(nextPos);

      if (x < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        // Snap to whole number and check queued step (HalvenMotos Section 14 & 16)
        posRef.current = moveRef.current.to;
        moveRef.current.active = false;
        renderFrameAtPos(posRef.current);

        if (queuedStepRef.current !== 0) {
          const stepDir = queuedStepRef.current;
          queuedStepRef.current = 0;
          startMoveTo(Math.round(posRef.current) + stepDir);
        } else {
          scheduleAutoplay(2000);
        }
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);
  };

  // Arrow click handler with step queueing during active travel (HalvenMotos Section 16)
  const handleArrowStep = (delta: -1 | 1) => {
    if (dragRef.current.pointerId !== null) return;
    if (moveRef.current.active) {
      queuedStepRef.current = delta;
      return;
    }
    startMoveTo(Math.round(posRef.current) + delta);
  };

  // Pointer drag & flick release joining the cubic-bezier curve without jump (HalvenMotos Section 17)
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (dragRef.current.pointerId !== null) return;

    clearAutoplay();
    queuedStepRef.current = 0;

    const interruptedDest = moveRef.current.active
      ? moveRef.current.to
      : null;
    moveRef.current.active = false;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    dragRef.current = {
      pointerId: e.pointerId,
      downX: e.clientX,
      downY: e.clientY,
      startPos: posRef.current,
      active: false,
      interruptedDest,
      trail: [{ x: e.clientX, t: performance.now() }],
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragRef.current.downX;
    const dy = e.clientY - dragRef.current.downY;

    if (!dragRef.current.active) {
      if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) {
        dragRef.current.active = true;
      } else {
        return;
      }
    }

    const now = performance.now();
    dragRef.current.trail.push({ x: e.clientX, t: now });
    // Keep last 90ms of samples
    dragRef.current.trail = dragRef.current.trail.filter(
      (s) => now - s.t <= 90
    );

    const step = Math.max(1, geomRef.current.step);
    posRef.current = dragRef.current.startPos - dx / step;
    renderFrameAtPos(posRef.current);
  };

  const handlePointerRelease = (
    e: ReactPointerEvent<HTMLDivElement>,
    cancelled: boolean
  ) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    const wasActive = dragRef.current.active;
    const interruptedDest = dragRef.current.interruptedDest;
    const trail = dragRef.current.trail;

    dragRef.current.pointerId = null;
    dragRef.current.active = false;

    if (!wasActive) {
      // A tap with no drag either resumes interrupted move or opens Quick Buy if centered
      if (interruptedDest !== null) {
        startMoveTo(interruptedDest);
      } else {
        const activeShoe =
          FEATURED_SHOES[modSlide(posRef.current)] ?? FEATURED_SHOES[0];
        onSelectShoeToBuy(activeShoe);
        scheduleAutoplay(2000);
      }
      return;
    }

    const now = performance.now();
    let speed = 0;
    if (trail.length >= 2) {
      const last = trail[trail.length - 1];
      const first = trail[0];
      const dt = last.t - first.t;
      if (now - last.t < 90 && dt > 0) {
        speed = (last.x - first.x) / dt;
      }
    }

    let target = Math.round(posRef.current);
    if (!cancelled && Math.abs(speed) > 0.45) {
      target =
        speed < 0 ? Math.ceil(posRef.current) : Math.floor(posRef.current);
    }

    const diff = target - posRef.current;
    if (Math.abs(diff) < 1e-4) {
      posRef.current = target;
      renderFrameAtPos(target);
      scheduleAutoplay(2000);
      return;
    }

    // HalvenMotos Section 17.5: Join the cubic-bezier curve instead of starting a new one
    const remaining = Math.min(1, Math.abs(diff));
    const dir = Math.sign(diff);
    const virtualStart = now - inverseEaseHalven(1 - remaining) * 1400;
    startMoveTo(target, virtualStart, target - dir);
  };

  // Load the 3 high-resolution 2048x1024 shoe textures & observe resize
  useEffect(() => {
    let mounted = true;

    const updateLayout = () => {
      const heroEl = heroRef.current;
      if (!heroEl) return;
      geomRef.current = computeHeroGeometry(
        heroEl.clientWidth,
        heroEl.clientHeight
      );
      renderFrameAtPos(posRef.current);
    };

    updateLayout();

    const ro = new ResizeObserver(() => {
      updateLayout();
    });
    if (heroRef.current) {
      ro.observe(heroRef.current);
    }

    // Build all 3 high-res side-profile shoe textures in parallel
    Promise.all(
      FEATURED_SHOES.map((shoe) =>
        buildShoeCarouselTexture(shoe.angles.lateral)
      )
    ).then((loadedTextures) => {
      if (!mounted) return;
      texturesRef.current = loadedTextures;
      setIsLoaded(true);
      renderFrameAtPos(posRef.current);
      // First autoplay wait begins 1000ms after reveal so first slide runs at 3000ms (HalvenMotos Section 15)
      scheduleAutoplay(3000);
    });

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearAutoplay();
      } else {
        scheduleAutoplay(2000);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mounted = false;
      ro.disconnect();
      clearAutoplay();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentShoe = FEATURED_SHOES[activeSlideIdx] ?? FEATURED_SHOES[0];

  return (
    <section
      ref={heroRef}
      id="home"
      aria-roledescription="carousel"
      aria-label="Sole Purpose featured court colorways"
      className="relative flex h-screen min-h-[640px] w-full flex-col justify-between overflow-hidden pt-24 pb-10 select-none [isolation:isolate] sm:pt-24 sm:pb-12"
      style={{ backgroundColor: "#3B1D6E" }}
    >
      {/* Layer 0: HalvenMotos Dot Grid Layer (z-0) */}
      <div
        ref={dotGridRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 left-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.29) 0px, rgba(255,255,255,0.29) 1.15px, transparent 1.75px)",
          maskImage:
            "linear-gradient(to bottom, black 25%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 25%, transparent 100%)",
        }}
      />

      {/* Layer 1: Backdrop Word Stack ("You Deserve The Best" + Giant "LUXURIOUS") under the shoes (z-10) */}
      <div
        className={`pointer-events-none relative z-10 mx-auto mt-3 flex w-full max-w-[1380px] flex-col items-center px-4 text-center transition-all duration-700 sm:mt-5 ${
          isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <p className="text-xl font-light tracking-[0.06em] text-white/90 sm:text-3xl md:text-4xl">
          You Deserve The Best
        </p>
        <h1 className="metallic-hero-text font-display -mt-1 w-full text-center text-[clamp(2.75rem,10vw,8.4rem)] leading-[0.92] font-extrabold tracking-[0.05em] uppercase">
          LUXURIOUS
        </h1>
      </div>

      {/* Layer 2: High-DPI Carousel Canvas where center shoe overlaps lower-middle of LUXURIOUS (z-20) */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 h-full w-full transition-opacity duration-700 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Layer 3: Transparent 1:1 Pointer Drag & Flick Surface (z-30) */}
      <div
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerRelease(e, false)}
        onPointerCancel={(e) => handlePointerRelease(e, true)}
        className="absolute inset-0 z-30 cursor-grab touch-pan-y active:cursor-grabbing"
        title={`Drag to slide colorways or click to inspect ${currentShoe.name}`}
      />

      {/* Layer 5: Stationary Yellow/Studio Carousel Arrow Buttons (HalvenMotos Section 9, z-40) */}
      <button
        ref={prevBtnRef}
        type="button"
        aria-label="Previous colour"
        onClick={() => handleArrowStep(-1)}
        className=" fixed-arrow absolute z-40 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#FFE100] text-[#16140A] shadow-[0_8px_24px_rgba(0,0,0,0.35)] after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-[40%] w-[40%] fill-none stroke-current stroke-[1.7]"
        >
          <path d="M15 8H1.6M7 2.4 1.4 8 7 13.6" />
        </svg>
      </button>

      <button
        ref={nextBtnRef}
        type="button"
        aria-label="Next colour"
        onClick={() => handleArrowStep(1)}
        className="fixed-arrow absolute z-40 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#FFE100] text-[#16140A] shadow-[0_8px_24px_rgba(0,0,0,0.35)] after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-[40%] w-[40%] fill-none stroke-current stroke-[1.7]"
        >
          <path d="M1 8h13.4M9 2.4 14.6 8 9 13.6" />
        </svg>
      </button>

      {/* Layer 4: Bottom Copy & SHOP NOW Button matching reference homepage.webp (z-40) */}
      <div className="pointer-events-none relative z-40 mx-auto mt-auto flex w-full max-w-4xl flex-col items-center px-6">
        <div className="grid w-full max-w-xl grid-cols-1 items-center gap-4 border-white/20 sm:grid-cols-2 sm:gap-6">
          <p className="text-center text-xs leading-relaxed text-zinc-200/85 sm:text-right sm:text-sm">
            Discover our latest collection of performance trainers built for
            comfort, speed, and everyday wear.
          </p>
          <div className="text-center sm:border-l sm:border-white/20 sm:pl-6 sm:text-left">
            <p className="text-3xl leading-[1.05] font-light tracking-tight text-white sm:text-4xl">
              Elevate
              <br />
              <span className="text-zinc-200">Comfort</span>
            </p>
          </div>
        </div>

        {/* Bottom Pill CTA: SHOP NOW */}
        <button
          type="button"
          onClick={onShopNowClick}
          className="pointer-events-auto mt-6 cursor-pointer rounded-full border border-white/45 bg-black/30 px-14 py-3 text-xs font-medium tracking-[0.22em] text-white uppercase shadow-[0_0_30px_rgba(0,0,0,0.2)] backdrop-blur-xs transition-all duration-300 hover:scale-105 hover:border-white hover:bg-white hover:text-black"
        >
          SHOP NOW
        </button>
      </div>

      {/* Visually Hidden Polite Live Region (HalvenMotos Section 4 & 19) */}
      <p className="sr-only" aria-live="polite">
        {`${currentShoe.name} — ${currentShoe.colorwayName}`}
      </p>
    </section>
  );
}

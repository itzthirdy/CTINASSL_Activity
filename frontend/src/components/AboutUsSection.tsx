import { useEffect, useRef } from "react";
import { animate, createScope, stagger } from "animejs";

interface AboutUsSectionProps {
  onExploreShop: () => void;
}

interface SpeedStreak {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
  color: string;
  width: number;
}

interface ShotArc {
  progress: number;
  speed: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  peakY: number;
  color: string;
}

interface ArenaMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: string;
}

export function AboutUsSection({ onExploreShop }: AboutUsSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const revealedRef = useRef(false);

  // Scroll-triggered entrance reveal for foreground story and studio card
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      root.querySelectorAll<HTMLElement>(".about-reveal-item").forEach((el) => {
        el.style.opacity = "1";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !revealedRef.current) {
            revealedRef.current = true;
            const items = root.querySelectorAll(".about-reveal-item");
            animate(items, {
              opacity: [0, 1],
              translateY: [36, 0],
              delay: stagger(140),
              duration: 780,
              ease: "outExpo",
            });
          }
        }
      },
      { threshold: 0.16 }
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // Anime.js v4 Sports Arena Blueprint & Floodlight Choreography
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const scope = createScope({ root }).add(() => {
      // Animated energy pulse tracing along the basketball court lines
      animate(".court-pulse-line", {
        strokeDashoffset: [420, 0],
        duration: 4200,
        ease: "linear",
        loop: true,
      });

      animate(".court-center-ring", {
        rotate: [0, 360],
        duration: 36000,
        ease: "linear",
        loop: true,
      });

      // Sweeping stadium arena floodlights
      animate(".arena-spotlight-left", {
        rotate: [-14, 8],
        opacity: [0.35, 0.72],
        duration: 7500,
        ease: "inOutSine",
        loop: true,
        alternate: true,
      });

      animate(".arena-spotlight-right", {
        rotate: [14, -8],
        opacity: [0.3, 0.68],
        duration: 8800,
        ease: "inOutSine",
        loop: true,
        alternate: true,
      });

      // Subtle continuous sports marquee watermark drift
      animate(".sports-marquee-track", {
        translateX: ["0%", "-50%"],
        duration: 28000,
        ease: "linear",
        loop: true,
      });
    });

    return () => {
      scope.revert();
    };
  }, []);

  // 60fps Sports Velocity Streaks, Parabolic Rim Arcs & Stadium Dust Canvas
  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = section.clientWidth || 1280;
    let height = section.clientHeight || 600;
    let rafId = 0;

    const palette = [
      "245, 158, 11", // Ja 4 University Gold / Amber
      "168, 85, 247", // Ja 4 Thermal Violet
      "59, 130, 246", // Caitlin 1 Hyper Royal
    ];

    const resize = () => {
      width = section.clientWidth || 1280;
      height = section.clientHeight || 600;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(section);

    // Initialize diagonal athletic speed streaks
    const streaks: SpeedStreak[] = Array.from({ length: 18 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 75 + Math.random() * 140,
      speed: 1.6 + Math.random() * 2.4,
      alpha: 0.08 + Math.random() * 0.18,
      color: palette[i % palette.length],
      width: 1 + Math.random() * 1.4,
    }));

    // Initialize parabolic basketball shot/leap trajectories
    const createShotArc = (i: number): ShotArc => {
      const startX = width * (0.05 + Math.random() * 0.25);
      const endX = width * (0.68 + Math.random() * 0.27);
      const startY = height * (0.72 + Math.random() * 0.2);
      const endY = height * (0.28 + Math.random() * 0.28);
      return {
        progress: Math.random(),
        speed: 0.0022 + Math.random() * 0.0018,
        startX,
        startY,
        endX,
        endY,
        peakY: Math.min(startY, endY) - (110 + Math.random() * 110),
        color: palette[i % palette.length],
      };
    };
    const arcs: ShotArc[] = Array.from({ length: 4 }, (_, i) =>
      createShotArc(i)
    );

    // Initialize stadium spotlight motes
    const motes: ArenaMote[] = Array.from({ length: 28 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.25 - Math.random() * 0.45,
      r: 1 + Math.random() * 2,
      alpha: 0.15 + Math.random() * 0.4,
      color: i % 4 === 0 ? "255, 255, 255" : palette[i % palette.length],
    }));

    const drawQuadBezierPoint = (
      p0x: number,
      p0y: number,
      cx: number,
      cy: number,
      p1x: number,
      p1y: number,
      t: number
    ) => {
      const u = 1 - t;
      return {
        x: u * u * p0x + 2 * u * t * cx + t * t * p1x,
        y: u * u * p0y + 2 * u * t * cy + t * t * p1y,
      };
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Diagonal speed streaks (fast-break velocity lines)
      const angleRad = -0.32;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);

      for (const s of streaks) {
        s.x += cosA * s.speed;
        s.y += sinA * s.speed;

        if (s.x - s.len > width + 80 || s.y + s.len < -80) {
          s.x = -80 - Math.random() * 180;
          s.y = height * (0.15 + Math.random() * 0.95);
        }

        const x2 = s.x + cosA * s.len;
        const y2 = s.y + sinA * s.len;

        const grad = ctx.createLinearGradient(s.x, s.y, x2, y2);
        grad.addColorStop(0, `rgba(${s.color}, 0)`);
        grad.addColorStop(0.55, `rgba(${s.color}, ${s.alpha})`);
        grad.addColorStop(1, `rgba(${s.color}, 0)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 2. Parabolic "Above The Rim" trajectory arcs
      for (let i = 0; i < arcs.length; i++) {
        const arc = arcs[i];
        arc.progress += arc.speed;
        if (arc.progress >= 1.25) {
          arcs[i] = createShotArc(i);
          arcs[i].progress = 0;
          continue;
        }

        const ctrlX = (arc.startX + arc.endX) * 0.5;
        const ctrlY = arc.peakY;

        // Faint full trajectory guide
        ctx.strokeStyle = `rgba(${arc.color}, 0.06)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(arc.startX, arc.startY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, arc.endX, arc.endY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glowing comet trail along the arc
        const headT = Math.min(1, arc.progress);
        const tailT = Math.max(0, arc.progress - 0.22);
        const fadeOut = arc.progress > 1 ? Math.max(0, 1 - (arc.progress - 1) * 4) : 1;

        if (headT > tailT && fadeOut > 0.01) {
          const steps = 16;
          for (let k = 0; k < steps; k++) {
            const tA = tailT + ((headT - tailT) * k) / steps;
            const tB = tailT + ((headT - tailT) * (k + 1)) / steps;
            const ptA = drawQuadBezierPoint(
              arc.startX,
              arc.startY,
              ctrlX,
              ctrlY,
              arc.endX,
              arc.endY,
              tA
            );
            const ptB = drawQuadBezierPoint(
              arc.startX,
              arc.startY,
              ctrlX,
              ctrlY,
              arc.endX,
              arc.endY,
              tB
            );
            const segAlpha = ((k + 1) / steps) * 0.42 * fadeOut;
            ctx.strokeStyle = `rgba(${arc.color}, ${segAlpha.toFixed(3)})`;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(ptA.x, ptA.y);
            ctx.lineTo(ptB.x, ptB.y);
            ctx.stroke();
          }

          // Bright head spark
          const headPt = drawQuadBezierPoint(
            arc.startX,
            arc.startY,
            ctrlX,
            ctrlY,
            arc.endX,
            arc.endY,
            headT
          );
          ctx.fillStyle = `rgba(${arc.color}, ${(0.85 * fadeOut).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(headPt.x, headPt.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Stadium dust motes floating upward through arena floodlights
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(${m.color}, ${m.alpha})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about-us"
      className="relative overflow-hidden border-t border-white/10 bg-[#070709] py-24 text-white sm:py-28"
    >
      {/* Sports Arena Animated Background Layers */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* 1. Sweeping Stadium Overhead Floodlight Cones */}
        <div className="arena-spotlight-left absolute -top-36 left-[8%] h-[520px] w-72 origin-top bg-gradient-to-b from-amber-400/20 via-purple-500/8 to-transparent blur-3xl" />
        <div className="arena-spotlight-right absolute -top-36 right-[12%] h-[520px] w-72 origin-top bg-gradient-to-b from-blue-400/20 via-purple-500/8 to-transparent blur-3xl" />

        {/* 2. Subtle Kinetic Sports Watermark Marquee */}
        <div className="absolute top-1/2 left-0 w-[200%] -translate-y-1/2 overflow-hidden select-none">
          <div className="sports-marquee-track font-sport flex whitespace-nowrap text-[5.5rem] tracking-[0.12em] text-white/[0.025] uppercase italic sm:text-[8rem]">
            <span className="pr-14">
              PLAY ABOVE THE RIM · ENGINEERED PERFORMANCE · SOLE PURPOSE ·
            </span>
            <span className="pr-14">
              PLAY ABOVE THE RIM · ENGINEERED PERFORMANCE · SOLE PURPOSE ·
            </span>
          </div>
        </div>

        {/* 3. Perspective Basketball Court Blueprint SVG with Animated Pulse Lines */}
        <svg
          viewBox="0 0 1200 620"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full opacity-30"
        >
          <defs>
            <linearGradient id="courtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#A855F7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.55" />
            </linearGradient>
          </defs>

          {/* Outer Court Sidelines */}
          <rect
            x="40"
            y="36"
            width="1120"
            height="548"
            rx="16"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />

          {/* Half-Court Division Line */}
          <line
            x1="600"
            y1="36"
            x2="600"
            y2="584"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1.5"
          />

          {/* Center Jump Circle + Animated Rotating Outer Ring */}
          <g
            className="court-center-ring"
            style={{ transformOrigin: "600px 310px" }}
          >
            <circle
              cx="600"
              cy="310"
              r="116"
              fill="none"
              stroke="url(#courtGrad)"
              strokeWidth="1.4"
              strokeDasharray="18 14"
            />
          </g>
          <circle
            cx="600"
            cy="310"
            r="68"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1.2"
          />

          {/* Left 3-Point Arc & Key */}
          <path
            d="M 40 96 L 195 96 A 214 214 0 0 1 195 524 L 40 524"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />
          <path
            className="court-pulse-line"
            d="M 40 96 L 195 96 A 214 214 0 0 1 195 524 L 40 524"
            fill="none"
            stroke="url(#courtGrad)"
            strokeWidth="2"
            strokeDasharray="140 280"
          />
          <rect
            x="40"
            y="214"
            width="210"
            height="192"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.2"
          />

          {/* Right 3-Point Arc & Key */}
          <path
            d="M 1160 96 L 1005 96 A 214 214 0 0 0 1005 524 L 1160 524"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />
          <path
            className="court-pulse-line"
            d="M 1160 96 L 1005 96 A 214 214 0 0 0 1005 524 L 1160 524"
            fill="none"
            stroke="url(#courtGrad)"
            strokeWidth="2"
            strokeDasharray="140 280"
          />
          <rect
            x="950"
            y="214"
            width="210"
            height="192"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.2"
          />
        </svg>

        {/* 4. 60fps Velocity Streaks, Rim Arcs & Stadium Motes Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
        {/* Story Grid */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Story Column */}
          <div className="about-reveal-item opacity-0 lg:col-span-6">
            <div className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-amber-300 uppercase">
              <span>About Sole Purpose</span>
            </div>

            <h2 className="font-sport mt-4 text-2xl leading-[1.15] tracking-wide text-white uppercase italic sm:text-3xl lg:text-[2rem] xl:text-[2.25rem]">
              BUILT FOR THOSE WHO
              <br />
              PLAY{" "}
              <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-purple-400 bg-clip-text text-transparent">
                ABOVE THE RIM
              </span>
            </h2>

            <p className="mt-5 text-justify text-base leading-relaxed text-zinc-300">
              Founded for athletes and sneaker purists across the Philippines,{" "}
              <strong className="font-semibold text-white">Sole Purpose</strong>{" "}
              bridges luxury studio presentation with uncompromising court
              performance. Whether it is the explosive first-step containment of
              the <span className="text-amber-300">Ja 4 'Heat Check' EP</span>{" "}
              or the deep-range precision of the{" "}
              <span className="text-blue-300">Caitlin 1 EP</span>, we curate
              footwear engineered for speed, comfort, and everyday elevation.
            </p>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={onExploreShop}
                className="cursor-pointer rounded-full bg-white px-9 py-3.5 text-xs font-bold tracking-[0.18em] text-black uppercase shadow-[0_0_24px_rgba(255,255,255,0.16)] transition hover:scale-105 hover:bg-amber-300"
              >
                Explore The Lineup
              </button>
            </div>
          </div>

          {/* Right Highlight Stat Box */}
          <div className="about-reveal-item opacity-0 lg:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-11">
              <div className="border-b border-white/15 pb-7 text-center">
                <p className="text-sm font-semibold tracking-[0.26em] text-amber-300/90 uppercase sm:text-base">
                  Signature Showcase
                </p>
                <p className="font-sport mt-2 text-2xl tracking-wide text-white uppercase italic sm:text-3xl">
                  SOLE PURPOSE STUDIO
                </p>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 text-center sm:gap-5">
                <div className="rounded-2xl border border-white/10 bg-black/45 px-3 py-7 transition-colors hover:border-amber-400/35 sm:px-5 sm:py-9">
                  <p className="font-sport text-3xl text-amber-300 italic sm:text-4xl">
                    360°
                  </p>
                  <p className="mt-2 text-xs text-zinc-400 sm:text-sm">
                    Turntable Plate
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/45 px-3 py-7 transition-colors hover:border-purple-400/35 sm:px-5 sm:py-9">
                  <p className="font-sport text-3xl text-purple-300 italic sm:text-4xl">
                    6x
                  </p>
                  <p className="mt-2 text-xs text-zinc-400 sm:text-sm">
                    Angles / Pair
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/45 px-3 py-7 transition-colors hover:border-blue-400/35 sm:px-5 sm:py-9">
                  <p className="font-sport text-3xl text-blue-300 italic sm:text-4xl">
                    100%
                  </p>
                  <p className="mt-2 text-xs text-zinc-400 sm:text-sm">
                    EP Verified
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

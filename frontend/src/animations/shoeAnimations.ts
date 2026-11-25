import type { PointerEvent as ReactPointerEvent } from "react";
import { animate, stagger } from "animejs";
import type { AnimationPresetType } from "../data/shoeCatalog";

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function playShopEntrance(cards: NodeListOf<HTMLElement>): void {
  if (!cards.length) return;
  if (reducedMotion()) {
    cards.forEach((c) => {
      c.style.opacity = "1";
      c.style.transform = "none";
    });
    return;
  }

  cards.forEach((card) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(64px) scale(0.86)";
  });

  animate(cards, {
    opacity: [0, 1],
    translateY: [64, 0],
    scale: [0.86, 1],
    delay: stagger(140, { start: 60 }),
    duration: 720,
    ease: "outBack(1.55)",
  });
}

export function playShoePresetAnimation(
  imgEl: HTMLElement | null,
  preset: AnimationPresetType = "studio-float"
): void {
  if (!imgEl || reducedMotion()) return;

  if (preset === "court-bounce") {
    animate(imgEl, {
      translateY: [-22, 0, -10, 0],
      rotate: [-8, 2, -4, 0],
      scale: [0.92, 1.08, 1],
      duration: 680,
      ease: "outBack(1.9)",
    });
    return;
  }

  if (preset === "velocity-sweep") {
    animate(imgEl, {
      translateX: [-26, 6, 0],
      translateY: [8, -10, 0],
      rotate: [-12, -3, 0],
      scale: [0.9, 1.07, 1],
      duration: 640,
      ease: "outExpo",
    });
    return;
  }

  // Default: "studio-float"
  animate(imgEl, {
    translateY: [10, -10],
    rotate: [0, -5],
    scale: [0.97, 1.06],
    duration: 520,
    ease: "outBack(1.6)",
  });
}

export function playShoeHoverLift(
  imgEl: HTMLElement | null,
  preset: AnimationPresetType = "studio-float"
): void {
  if (!imgEl || reducedMotion()) return;

  if (preset === "court-bounce") {
    animate(imgEl, {
      translateY: -14,
      rotate: -6,
      scale: 1.08,
      duration: 440,
      ease: "outBack(2.0)",
    });
  } else if (preset === "velocity-sweep") {
    animate(imgEl, {
      translateX: 6,
      translateY: -10,
      rotate: -8,
      scale: 1.08,
      duration: 420,
      ease: "outExpo",
    });
  } else {
    animate(imgEl, {
      translateY: -10,
      rotate: -4,
      scale: 1.07,
      duration: 460,
      ease: "outBack(1.7)",
    });
  }
}

export function resetShoeHoverLift(imgEl: HTMLElement | null): void {
  if (!imgEl || reducedMotion()) return;
  animate(imgEl, {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    scale: 1,
    duration: 420,
    ease: "outExpo",
  });
}

export function apply3DPerspectiveTilt(
  cardEl: HTMLElement | null,
  imgEl: HTMLElement | null,
  sheenEl: HTMLElement | null,
  e: ReactPointerEvent<HTMLElement>
): void {
  if (!cardEl || !imgEl || reducedMotion()) return;
  const rect = cardEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. +0.5
  const ny = (e.clientY - rect.top) / rect.height - 0.5;

  const rotateY = nx * 16;
  const rotateX = -ny * 14;

  cardEl.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
  imgEl.style.transform = `translate3d(${(nx * 14).toFixed(1)}px, ${(ny * 10 - 10).toFixed(1)}px, 28px) scale(1.07) rotate(${(-4 + nx * 4).toFixed(2)}deg)`;

  if (sheenEl) {
    sheenEl.style.opacity = "1";
    sheenEl.style.background = `radial-gradient(circle at ${((nx + 0.5) * 100).toFixed(1)}% ${((ny + 0.5) * 100).toFixed(1)}%, rgba(255,255,255,0.42), transparent 55%)`;
  }
}

export function reset3DPerspectiveTilt(
  cardEl: HTMLElement | null,
  imgEl: HTMLElement | null,
  sheenEl: HTMLElement | null
): void {
  if (cardEl) {
    cardEl.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }
  if (sheenEl) {
    sheenEl.style.opacity = "0";
  }
  resetShoeHoverLift(imgEl);
}


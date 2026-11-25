import { useEffect, useState } from "react";

export interface ShoeCarouselTexture {
  /** 2048 x 1024 full-resolution crisp texture canvas with 4-part ground shadow */
  sharpCanvas: HTMLCanvasElement;
  /** Pre-blurred 1024 x 512 texture canvas for ultra-smooth 60fps depth-of-field blending */
  blurredCanvas: HTMLCanvasElement;
}

export interface ExtractedShoePalette {
  roomRgb: [number, number, number];
  accentHex: string;
  glowRgb: string;
}

const API_ROOT = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"
).replace(/\/api\/?$/, "");

export function resolveAssetUrl(src: string): string {
  if (!src) return "";
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }
  if (src.startsWith("/uploads/")) {
    return `${API_ROOT}${src}`;
  }
  return src;
}

const textureCache = new Map<string, ShoeCarouselTexture>();
const inflightCache = new Map<string, Promise<ShoeCarouselTexture>>();

const tightCutoutCache = new Map<string, string>();
const tightCutoutInflight = new Map<string, Promise<string>>();

/**
 * Isolates the shoe from white/neutral studio backgrounds (#FFFFFF / #F5F5F5 -> #888888)
 * via 4-border BFS flood-fill with tunable `sensitivity` (0..100) and un-premultiplies
 * anti-aliased boundary pixels so zero white halo remains.
 */
export function segmentAndUnpremultiplyShoe(
  img: HTMLImageElement,
  sensitivity = 50
): {
  canvas: HTMLCanvasElement;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;

  const rawCanvas = document.createElement("canvas");
  rawCanvas.width = w;
  rawCanvas.height = h;
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });
  if (!rawCtx) return null;

  rawCtx.drawImage(img, 0, 0, w, h);
  const imageData = rawCtx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const total = w * h;

  // Sample average border background pixel (top-left corner)
  const bgR = data[0] ?? 255;
  const bgG = data[1] ?? 255;
  const bgB = data[2] ?? 255;

  const s = Math.max(0, Math.min(100, sensitivity)) / 100;
  const maxChroma = 10 + s * 18; // 10..28
  const minLuma = 215 - s * 115; // 215..100
  const maxDistFromBorder = 24 + s * 52; // 24..76

  const isStudioBackdrop = (idx: number): boolean => {
    const i = idx * 4;
    if (data[i + 3] < 20) return true;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;

    if (chroma <= maxChroma && maxC >= minLuma) return true;

    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= maxDistFromBorder && chroma <= maxChroma + 6 && maxC >= 165) {
      return true;
    }

    return false;
  };

  const visited = new Uint8Array(total);
  const isBg = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const enqueue = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isStudioBackdrop(idx)) {
      isBg[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % w;
    const cy = (curr - cx) / w;
    if (cx > 0) enqueue(cx - 1, cy);
    if (cx < w - 1) enqueue(cx + 1, cy);
    if (cy > 0) enqueue(cx, cy - 1);
    if (cy < h - 1) enqueue(cx, cy + 1);
  }

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let idx = 0; idx < total; idx++) {
    const i = idx * 4;
    if (isBg[idx]) {
      data[i + 3] = 0;
      continue;
    }

    const x = idx % w;
    const y = (idx - x) / w;

    let bgNeighbors = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          if (isBg[ny * w + nx]) bgNeighbors++;
        }
      }
    }

    if (bgNeighbors > 0) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dr = r - bgR;
      const dg = g - bgG;
      const db = b - bgB;
      const distFromBg = Math.sqrt(dr * dr + dg * dg + db * db);
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);

      const rawAlpha = Math.min(
        1,
        Math.max(distFromBg / 58, chroma / 24) * (1 - bgNeighbors * 0.08)
      );

      const a255 = Math.round(rawAlpha * 255);
      const solidA =
        a255 < 14 ? 0 : Math.min(255, Math.round(((a255 - 10) * 255) / 225));

      if (solidA === 0) {
        data[i + 3] = 0;
        continue;
      }

      const invAlpha = Math.max(0.22, solidA / 255);
      data[i] = Math.max(
        0,
        Math.min(255, Math.round((r - (1 - invAlpha) * bgR) / invAlpha))
      );
      data[i + 1] = Math.max(
        0,
        Math.min(255, Math.round((g - (1 - invAlpha) * bgG) / invAlpha))
      );
      data[i + 2] = Math.max(
        0,
        Math.min(255, Math.round((b - (1 - invAlpha) * bgB) / invAlpha))
      );
      data[i + 3] = solidA;
    }

    if (data[i + 3] > 24) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  rawCtx.putImageData(imageData, 0, 0);
  return { canvas: rawCanvas, minX, minY, maxX, maxY };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Extracts a harmonious studio backdrop RGB (`roomRgb`), bright accent hex (`accentHex`),
 * and glow RGB from the isolated shoe pixels (ignoring removed studio background).
 */
export function extractShoeColorPalette(
  src: string,
  sensitivity = 50
): Promise<ExtractedShoePalette> {
  const resolved = resolveAssetUrl(src);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const seg = segmentAndUnpremultiplyShoe(img, sensitivity);
      if (!seg) {
        resolve({
          roomRgb: [52, 56, 72],
          accentHex: "#F59E0B",
          glowRgb: "245, 158, 11",
        });
        return;
      }

      const ctx = seg.canvas.getContext("2d");
      if (!ctx) {
        resolve({
          roomRgb: [52, 56, 72],
          accentHex: "#F59E0B",
          glowRgb: "245, 158, 11",
        });
        return;
      }

      const { width, height } = seg.canvas;
      const data = ctx.getImageData(0, 0, width, height).data;

      // Quantize into 12 hue buckets + fallback monochrome accumulator
      const buckets = Array.from({ length: 12 }, () => ({
        weight: 0,
        r: 0,
        g: 0,
        b: 0,
      }));
      let totalWeight = 0;

      const stride = Math.max(1, Math.floor((width * height) / 14000));
      for (let idx = 0; idx < width * height; idx += stride) {
        const i = idx * 4;
        if (data[i + 3] < 200) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const delta = maxC - minC;
        const sat = maxC === 0 ? 0 : delta / maxC;
        const lum = (r + g + b) / 3;

        // Skip near-white rubber midsoles and pitch-black sole shadows
        if (lum > 235 || lum < 18 || sat < 0.16) continue;

        let hue = 0;
        if (delta > 0) {
          if (maxC === r) hue = ((g - b) / delta) % 6;
          else if (maxC === g) hue = (b - r) / delta + 2;
          else hue = (r - g) / delta + 4;
          hue = ((hue * 60) + 360) % 360;
        }

        const bucketIdx = Math.min(11, Math.floor(hue / 30));
        const w = sat * sat * (1 - Math.abs(lum - 128) / 160);
        if (w <= 0) continue;

        buckets[bucketIdx].weight += w;
        buckets[bucketIdx].r += r * w;
        buckets[bucketIdx].g += g * w;
        buckets[bucketIdx].b += b * w;
        totalWeight += w;
      }

      if (totalWeight <= 0.01) {
        // Monochrome / triple-white / triple-black shoe -> sleek dark obsidian-steel studio
        resolve({
          roomRgb: [46, 52, 68],
          accentHex: "#E4E4E7",
          glowRgb: "148, 163, 184",
        });
        return;
      }

      buckets.sort((a, b) => b.weight - a.weight);
      const primary = buckets[0];
      const avgR = primary.r / primary.weight;
      const avgG = primary.g / primary.weight;
      const avgB = primary.b / primary.weight;

      // Scale dominant color into dramatic studio room range (peak ~ 118)
      const peak = Math.max(avgR, avgG, avgB, 1);
      const roomScale = Math.min(1.1, 118 / peak);
      const roomRgb: [number, number, number] = [
        Math.max(14, Math.min(140, Math.round(avgR * roomScale))),
        Math.max(14, Math.min(140, Math.round(avgG * roomScale))),
        Math.max(14, Math.min(140, Math.round(avgB * roomScale))),
      ];

      // Secondary accent (or vibrant primary) for highlight pills & glow
      const secondary =
        buckets[1] && buckets[1].weight > primary.weight * 0.18
          ? buckets[1]
          : primary;
      const accR = Math.min(255, Math.round((secondary.r / secondary.weight) * 1.15));
      const accG = Math.min(255, Math.round((secondary.g / secondary.weight) * 1.15));
      const accB = Math.min(255, Math.round((secondary.b / secondary.weight) * 1.15));

      resolve({
        roomRgb,
        accentHex: rgbToHex(accR, accG, accB),
        glowRgb: `${accR}, ${accG}, ${accB}`,
      });
    };
    img.onerror = () =>
      resolve({
        roomRgb: [52, 56, 72],
        accentHex: "#F59E0B",
        glowRgb: "245, 158, 11",
      });
    img.src = resolved;
  });
}

/**
 * Builds a tightly cropped, zero-halo transparent PNG cutout so shoes fill store cards
 * and Product Detail views cleanly on any background.
 */
export function buildTightShoeCutout(
  src: string,
  sensitivity = 50
): Promise<string> {
  const resolved = resolveAssetUrl(src);
  if (!resolved) return Promise.resolve("");

  const cacheKey = `${resolved}::${sensitivity}`;
  const cached = tightCutoutCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const existing = tightCutoutInflight.get(cacheKey);
  if (existing) return existing;

  const promise = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const seg = segmentAndUnpremultiplyShoe(img, sensitivity);
      if (!seg || seg.maxX <= seg.minX || seg.maxY <= seg.minY) {
        resolve(resolved);
        return;
      }

      const cropW = seg.maxX - seg.minX + 1;
      const cropH = seg.maxY - seg.minY + 1;

      const outCanvas = document.createElement("canvas");
      outCanvas.width = cropW;
      outCanvas.height = cropH;
      const outCtx = outCanvas.getContext("2d");
      if (!outCtx) {
        resolve(resolved);
        return;
      }

      outCtx.drawImage(
        seg.canvas,
        seg.minX,
        seg.minY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
      );

      const dataUrl = outCanvas.toDataURL("image/png");
      tightCutoutCache.set(cacheKey, dataUrl);
      resolve(dataUrl);
    };
    img.onerror = () => resolve(resolved);
    img.src = resolved;
  });

  tightCutoutInflight.set(cacheKey, promise);
  return promise;
}

export function useShoeCutoutUrl(src: string, sensitivity = 50): string {
  const resolved = resolveAssetUrl(src);
  const cacheKey = `${resolved}::${sensitivity}`;
  const [url, setUrl] = useState<string>(
    () => tightCutoutCache.get(cacheKey) ?? resolved
  );

  useEffect(() => {
    let active = true;
    if (!resolved) return;
    buildTightShoeCutout(resolved, sensitivity).then((res) => {
      if (active) setUrl(res);
    });
    return () => {
      active = false;
    };
  }, [resolved, sensitivity]);

  return resolved ? url : "";
}

export function preloadShoeCutouts(urls: string[], sensitivity = 50): void {
  for (const url of urls) {
    if (url) {
      void buildTightShoeCutout(url, sensitivity);
    }
  }
}

/**
 * Composes a 2048 x 1024 hero carousel texture with 4-part elliptical ground shadow at y = 956.
 */
export function buildShoeCarouselTexture(
  src: string,
  sensitivity = 50
): Promise<ShoeCarouselTexture> {
  const resolved = resolveAssetUrl(src);
  const cacheKey = `${resolved}::${sensitivity}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const existing = inflightCache.get(cacheKey);
  if (existing) return existing;

  const promise = new Promise<ShoeCarouselTexture>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const sharpCanvas = document.createElement("canvas");
      sharpCanvas.width = 2048;
      sharpCanvas.height = 1024;
      const sharpCtx = sharpCanvas.getContext("2d");

      const blurredCanvas = document.createElement("canvas");
      blurredCanvas.width = 1024;
      blurredCanvas.height = 512;
      const blurredCtx = blurredCanvas.getContext("2d");

      const seg = segmentAndUnpremultiplyShoe(img, sensitivity);
      if (!seg || !sharpCtx || !blurredCtx) {
        resolve({ sharpCanvas, blurredCanvas });
        return;
      }

      const drawEllipticalShadow = (
        cx: number,
        cy: number,
        rx: number,
        ry: number,
        peakAlpha: number
      ) => {
        sharpCtx.save();
        sharpCtx.translate(cx, cy);
        sharpCtx.scale(rx, ry);
        const grad = sharpCtx.createRadialGradient(0, 0, 0, 0, 0, 1);
        grad.addColorStop(0, `rgba(10, 7, 10, ${peakAlpha})`);
        grad.addColorStop(
          0.45,
          `rgba(10, 7, 10, ${(peakAlpha * 0.55).toFixed(3)})`
        );
        grad.addColorStop(1, "rgba(10, 7, 10, 0)");
        sharpCtx.fillStyle = grad;
        sharpCtx.beginPath();
        sharpCtx.arc(0, 0, 1, 0, Math.PI * 2);
        sharpCtx.fill();
        sharpCtx.restore();
      };

      drawEllipticalShadow(1024, 954, 920, 54, 0.32);
      drawEllipticalShadow(1024, 956, 680, 32, 0.28);
      drawEllipticalShadow(134 + 0.22 * 1780, 957, 290, 24, 0.82);
      drawEllipticalShadow(134 + 0.78 * 1780, 957, 310, 24, 0.82);

      if (seg.maxX > seg.minX && seg.maxY > seg.minY) {
        const cropW = seg.maxX - seg.minX + 1;
        const cropH = seg.maxY - seg.minY + 1;

        const maxDrawW = 1620;
        const maxDrawH = 820;
        const fitScale = Math.min(maxDrawW / cropW, maxDrawH / cropH);
        const drawW = cropW * fitScale;
        const drawH = cropH * fitScale;
        const drawLeft = (2048 - drawW) * 0.5;
        const drawTop = 960 - drawH;

        sharpCtx.imageSmoothingEnabled = true;
        sharpCtx.imageSmoothingQuality = "high";
        sharpCtx.drawImage(
          seg.canvas,
          seg.minX,
          seg.minY,
          cropW,
          cropH,
          drawLeft,
          drawTop,
          drawW,
          drawH
        );
      }

      blurredCtx.imageSmoothingEnabled = true;
      blurredCtx.imageSmoothingQuality = "high";
      blurredCtx.filter = "blur(7px)";
      blurredCtx.drawImage(sharpCanvas, 0, 0, 1024, 512);
      blurredCtx.filter = "none";

      const result: ShoeCarouselTexture = { sharpCanvas, blurredCanvas };
      textureCache.set(cacheKey, result);
      resolve(result);
    };

    img.onerror = () => {
      const sharpCanvas = document.createElement("canvas");
      const blurredCanvas = document.createElement("canvas");
      resolve({ sharpCanvas, blurredCanvas });
    };

    img.src = resolved;
  });

  inflightCache.set(cacheKey, promise);
  return promise;
}

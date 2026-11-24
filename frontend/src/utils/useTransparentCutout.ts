import { useEffect, useState } from "react";

export interface ShoeCarouselTexture {
  /** 2048 x 1024 full-resolution crisp texture canvas with 4-part ground shadow */
  sharpCanvas: HTMLCanvasElement;
  /** Pre-blurred 1024 x 512 texture canvas for ultra-smooth 60fps depth-of-field blending */
  blurredCanvas: HTMLCanvasElement;
}

const textureCache = new Map<string, ShoeCarouselTexture>();
const inflightCache = new Map<string, Promise<ShoeCarouselTexture>>();

const tightCutoutCache = new Map<string, string>();
const tightCutoutInflight = new Map<string, Promise<string>>();

/**
 * Isolates the shoe from its neutral studio background (#F5F5F5 -> #888888) via
 * 4-border BFS flood-fill and un-premultiplies anti-aliased boundary pixels so
 * zero dark/shady edge rim and zero white halo remain.
 */
function segmentAndUnpremultiplyShoe(
  img: HTMLImageElement
): {
  canvas: HTMLCanvasElement;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const rawCanvas = document.createElement("canvas");
  rawCanvas.width = w;
  rawCanvas.height = h;
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });
  if (!rawCtx) return null;

  rawCtx.drawImage(img, 0, 0, w, h);
  const imageData = rawCtx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const total = w * h;

  const bgR = data[0] || 245;
  const bgG = data[1] || 245;
  const bgB = data[2] || 245;

  const isStudioBackdrop = (idx: number): boolean => {
    const i = idx * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;

    if (chroma <= 18 && maxC >= 122) return true;
    if (chroma <= 11 && maxC >= 78 && maxC < 122) return true;
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

/**
 * Builds a tightly cropped, zero-halo transparent PNG cutout so shoes fill store cards
 * and Product Detail views at huge scale without inner gray box seams.
 */
export function buildTightShoeCutout(src: string): Promise<string> {
  const cached = tightCutoutCache.get(src);
  if (cached) return Promise.resolve(cached);

  const existing = tightCutoutInflight.get(src);
  if (existing) return existing;

  const promise = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const seg = segmentAndUnpremultiplyShoe(img);
      if (!seg || seg.maxX <= seg.minX || seg.maxY <= seg.minY) {
        resolve(src);
        return;
      }

      const cropW = seg.maxX - seg.minX + 1;
      const cropH = seg.maxY - seg.minY + 1;

      const outCanvas = document.createElement("canvas");
      outCanvas.width = cropW;
      outCanvas.height = cropH;
      const outCtx = outCanvas.getContext("2d");
      if (!outCtx) {
        resolve(src);
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
      tightCutoutCache.set(src, dataUrl);
      resolve(dataUrl);
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });

  tightCutoutInflight.set(src, promise);
  return promise;
}

export function useShoeCutoutUrl(src: string): string {
  const [url, setUrl] = useState<string>(() => tightCutoutCache.get(src) ?? src);

  useEffect(() => {
    let active = true;
    buildTightShoeCutout(src).then((res) => {
      if (active) setUrl(res);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return url;
}

export function preloadShoeCutouts(urls: string[]): void {
  for (const url of urls) {
    void buildTightShoeCutout(url);
  }
}

/**
 * HalvenMotos Section 11 style texture builder for the Home Hero Carousel:
 * Composes onto a 2048 x 1024 canvas with the 4-part elliptical ground shadow at y = 956
 * and shared scaling horizon at y = 490.5.
 */
export function buildShoeCarouselTexture(
  src: string
): Promise<ShoeCarouselTexture> {
  const cached = textureCache.get(src);
  if (cached) return Promise.resolve(cached);

  const existing = inflightCache.get(src);
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

      const seg = segmentAndUnpremultiplyShoe(img);
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
      textureCache.set(src, result);
      resolve(result);
    };

    img.onerror = () => {
      const sharpCanvas = document.createElement("canvas");
      const blurredCanvas = document.createElement("canvas");
      resolve({ sharpCanvas, blurredCanvas });
    };

    img.src = src;
  });

  inflightCache.set(src, promise);
  return promise;
}

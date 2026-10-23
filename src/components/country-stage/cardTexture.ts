/**
 * THE CARD FACE, painted once into a canvas and handed to WebGL as a texture.
 *
 * The hall's cards are the same card the grid below renders — photograph,
 * flag, serif name, TYPE / VALID / FEES — so the two read as one product. It
 * is drawn rather than rendered as DOM because the cards stand in a 3D ring
 * and are mirrored into the water, and only a texture can be both.
 *
 * The canvas holds two bands: a transparent strip on top for the hall's small
 * letter-spaced label (the Mirror Hall caption that floats above each card),
 * and the card itself below it. `LABEL_FRAC` is shared with the shaders so the
 * reflection can leave the caption out of the water.
 */

export const TEX_W = 640;
export const CARD_H = 1024; // 5:8, the grid card's aspect
export const LABEL_H = 128;
export const TEX_H = CARD_H + LABEL_H;
/** Share of the texture's height taken by the card (the rest is the label). */
export const CARD_FRAC = CARD_H / TEX_H;

const RADIUS = 34;

export type CardFace = {
  name: string;
  code: string;
  visaType: string;
  validity: string;
  feeLabel: string;
  feeValue: string;
  hue: number;
  photo?: string;
};

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/**
 * Cross-origin images must be requested with `crossOrigin` set, or the canvas
 * is tainted and WebGL refuses the upload outright. Wikimedia, Unsplash and
 * flagcdn all answer CORS requests; anything that does not resolves to null
 * and the card keeps its designed plate.
 */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  let pending = imageCache.get(src);
  if (!pending) {
    pending = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, pending);
  }
  return pending;
}

function fontFamily(variable: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

let fontsReady: Promise<void> | null = null;

/** next/font hashes its family names, so they are read back from the CSS variables. */
function families() {
  return {
    serif: fontFamily("--font-newsreader", "Georgia, serif"),
    sans: fontFamily("--font-inter", "system-ui, sans-serif"),
  };
}

export function waitForFonts(): Promise<void> {
  if (!fontsReady) {
    const { serif, sans } = families();
    fontsReady = Promise.all([
      document.fonts.load(`500 46px ${serif}`),
      document.fonts.load(`400 40px ${sans}`),
      document.fonts.load(`700 22px ${sans}`),
    ])
      .then(() => undefined)
      .catch(() => undefined);
  }
  return fontsReady;
}

function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(
    img,
    (img.naturalWidth - sw) / 2,
    (img.naturalHeight - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}

/** Greedy two-line wrap that balances the lines, like `text-balance` on the grid card. */
function balancedLines(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  if (ctx.measureText(text).width <= max) return [text];
  const words = text.split(" ");
  let best: string[] = [text];
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const wa = ctx.measureText(a).width;
    const wb = ctx.measureText(b).width;
    const score = Math.max(wa, wb);
    if (score < bestScore) {
      bestScore = score;
      best = [a, b];
    }
  }
  return best;
}

/**
 * Paints the face. Called twice per card: once immediately with the plate, so
 * a card is never blank while its photograph is in flight, and again when the
 * photograph and flag arrive. Returns the photograph's mean colour, which the
 * water uses for the light each card spills onto the pool.
 */
export function paintCard(
  canvas: HTMLCanvasElement,
  face: CardFace,
  photo: HTMLImageElement | null,
  flag: HTMLImageElement | null,
): [number, number, number] {
  const ctx = canvas.getContext("2d")!;
  const { serif, sans } = families();
  ctx.clearRect(0, 0, TEX_W, TEX_H);

  /* The caption above the card. */
  ctx.save();
  ctx.font = `400 40px ${sans}`;
  // Ink, to match the page: the caption stands on a pale sky.
  ctx.fillStyle = "rgba(22, 23, 27, 0.82)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "6px";
  let caption = face.name.toUpperCase();
  while (ctx.measureText(caption).width > TEX_W - 40 && caption.length > 4) {
    caption = caption.slice(0, -2).trimEnd() + "…";
    caption = caption.replace(/……$/, "…");
  }
  ctx.fillText(caption, TEX_W / 2, LABEL_H * 0.5);
  ctx.restore();

  const top = LABEL_H;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, top, TEX_W, CARD_H, RADIUS);
  ctx.clip();

  /* The plate: the same hue band the grid's fallback uses. */
  const plate = ctx.createLinearGradient(0, top, TEX_W, top + CARD_H);
  plate.addColorStop(0, `hsl(${face.hue} 48% 30%)`);
  plate.addColorStop(1, `hsl(${face.hue + 28} 52% 9%)`);
  ctx.fillStyle = plate;
  ctx.fillRect(0, top, TEX_W, CARD_H);

  let mean: [number, number, number] = hslToRgb(face.hue, 0.5, 0.35);
  if (photo) {
    coverDraw(ctx, photo, 0, top, TEX_W, CARD_H);
    mean = sampleMean(photo);
  }

  /* The scrim, three-stop so it fades into the photograph. */
  const scrim = ctx.createLinearGradient(0, top + CARD_H * 0.5, 0, top + CARD_H);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(0.45, "rgba(0,0,0,0.45)");
  scrim.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, top + CARD_H * 0.5, TEX_W, CARD_H * 0.5);

  /* Name, wrapped and balanced, then everything above it stacks up from the stats. */
  ctx.font = `500 50px ${serif}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const lines = balancedLines(ctx, face.name.toUpperCase(), TEX_W - 80);
  const statsTop = top + CARD_H - 108;
  const dividerY = statsTop - 26;
  const lineH = 50;
  const nameBase = dividerY - 28;
  const flagSize = 46;
  const flagY = nameBase - (lines.length - 1) * lineH - 50 - flagSize;

  if (flag) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(TEX_W / 2, flagY + flagSize / 2, flagSize / 2, 0, Math.PI * 2);
    ctx.clip();
    coverDraw(ctx, flag, TEX_W / 2 - flagSize / 2, flagY, flagSize, flagSize);
    ctx.restore();
  }

  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  lines.forEach((line, i) => {
    ctx.fillText(line, TEX_W / 2, nameBase - (lines.length - 1 - i) * lineH);
  });
  ctx.shadowColor = "transparent";

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(40, dividerY, TEX_W - 80, 2);

  const cols: [string, string, CanvasTextAlign, number][] = [
    ["TYPE", face.visaType.toUpperCase(), "left", 40],
    ["VALID", face.validity.toUpperCase(), "center", TEX_W / 2],
    [face.feeLabel.toUpperCase(), face.feeValue.toUpperCase(), "right", TEX_W - 40],
  ];
  for (const [label, value, align, x] of cols) {
    ctx.textAlign = align;
    ctx.font = `600 17px ${sans}`;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(label, x, statsTop + 24);
    ctx.font = `700 24px ${sans}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(value, x, statsTop + 60);
  }
  ctx.restore();

  /* Hairline edge, which is what catches the light in the hall. */
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(1.5, top + 1.5, TEX_W - 3, CARD_H - 3, RADIUS - 1);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  return mean;
}

function sampleMean(img: HTMLImageElement): [number, number, number] {
  try {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, 8, 8);
    const d = ctx.getImageData(0, 0, 8, 8).data;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
    }
    const n = d.length / 4;
    return [r / n / 255, g / n / 255, b / n / 255];
  } catch {
    return [0.4, 0.45, 0.6];
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/** The rendition closest to 640px wide from a srcSet, so the texture is sharp without being heavy. */
export function pickRendition(src: string, srcSet?: string): string {
  if (!srcSet) return src;
  const entries = srcSet
    .split(",")
    .map((part) => part.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: parseInt(w, 10) || 0 }))
    .sort((a, b) => a.w - b.w);
  return (entries.find((e) => e.w >= 640) ?? entries[entries.length - 1])?.url ?? src;
}

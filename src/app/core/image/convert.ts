import { ConverterDef } from './converters';
import { FORMATS, FormatId } from './formats';

export interface ConvertOptions {
  /** 0..1, used by lossy encoders. */
  readonly quality: number;
  /** Fill for transparent areas when the target has no alpha channel. */
  readonly background: string;
  readonly icoSizes: readonly number[];
  /** Output width for vector sources; null keeps the intrinsic size. */
  readonly svgWidth: number | null;
}

export const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256] as const;
export const MAX_SVG_WIDTH = 8192;

export type ConvertErrorCode = 'decode' | 'encode';

export class ConvertError extends Error {
  constructor(
    readonly code: ConvertErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
  }
}

interface Decoded {
  readonly image: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  release(): void;
}

export async function convertImage(file: Blob, converter: ConverterDef, opts: ConvertOptions): Promise<Blob> {
  const source = await decode(file, converter.from, opts);
  try {
    const target = FORMATS[converter.to];
    if (target.id === 'ico') return await encodeIco(source, opts.icoSizes);

    const canvas = draw(source, source.width, source.height, target.alpha ? null : opts.background);
    if (target.id === 'bmp') return encodeBmp(canvas);
    return await canvasToBlob(canvas, target.mimes[0], target.lossy ? opts.quality : undefined);
  } finally {
    source.release();
  }
}

const encodeSupport = new Map<FormatId, boolean>();

/** Canvas silently falls back to PNG for unknown types (e.g. WebP in Safari), so probe once. */
export function canEncode(format: FormatId): boolean {
  const mime = FORMATS[format].mimes[0];
  // Prerendering has no canvas: assume support, the browser re-checks on hydration.
  if (format === 'bmp' || format === 'ico' || format === 'png' || typeof document === 'undefined') return true;
  let supported = encodeSupport.get(format);
  if (supported === undefined) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    supported = c.toDataURL(mime).startsWith(`data:${mime}`);
    encodeSupport.set(format, supported);
  }
  return supported;
}

// ---------- decoding ----------

async function decode(file: Blob, from: FormatId, opts: ConvertOptions): Promise<Decoded> {
  try {
    if (from === 'svg') return await decodeSvg(file, opts.svgWidth);
    if (from === 'heic') return await decodeHeic(file);
    return await decodeRaster(file);
  } catch (cause) {
    throw new ConvertError('decode', { cause });
  }
}

async function decodeRaster(blob: Blob): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(blob);
    return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    // Some formats (e.g. ICO, certain BMP variants) only decode through <img>.
    const img = await loadImage(blob);
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, release: () => {} };
  }
}

async function decodeHeic(file: Blob): Promise<Decoded> {
  try {
    // Safari 17+ decodes HEIC natively.
    return await decodeRaster(file);
  } catch {
    // Lazy chunk; precached by the service worker so it also works offline.
    const { default: heic2any } = await import('heic2any');
    const out = await heic2any({ blob: file, toType: 'image/png' });
    return decodeRaster(Array.isArray(out) ? out[0] : out);
  }
}

async function decodeSvg(file: Blob, width: number | null): Promise<Decoded> {
  const doc = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.nodeName.toLowerCase() !== 'svg') throw new Error('Not an SVG document');

  let [w, h] = svgIntrinsicSize(svg);
  if (width) {
    h = Math.max(1, Math.round((h * width) / w));
    w = width;
  }
  // Explicit size makes every browser rasterize at the requested resolution.
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));

  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  const img = await loadImage(blob);
  return { image: img, width: w, height: h, release: () => {} };
}

function svgIntrinsicSize(svg: Element): [number, number] {
  const length = (name: string) => {
    const v = svg.getAttribute(name);
    return v && !v.trim().endsWith('%') ? parseFloat(v) : NaN;
  };
  const vb = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
  const vbW = vb.length === 4 && vb[2] > 0 ? vb[2] : NaN;
  const vbH = vb.length === 4 && vb[3] > 0 ? vb[3] : NaN;
  let w = length('width');
  let h = length('height');

  if (!(w > 0) && h > 0 && vbW && vbH) w = (h * vbW) / vbH;
  if (!(h > 0) && w > 0 && vbW && vbH) h = (w * vbH) / vbW;
  if (!(w > 0) || !(h > 0)) [w, h] = vbW && vbH ? [vbW, vbH] : [512, 512];

  const clamp = (n: number) => Math.min(MAX_SVG_WIDTH, Math.max(1, Math.round(n)));
  return [clamp(w), clamp(h)];
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- encoding ----------

function draw(src: Decoded, width: number, height: number, background: string | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src.image, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob && blob.type === mime ? resolve(blob) : reject(new ConvertError('encode'))),
      mime,
      quality,
    ),
  );
}

/** 24-bit uncompressed BMP. */
function encodeBmp(canvas: HTMLCanvasElement): Blob {
  const { width: w, height: h } = canvas;
  const px = canvas.getContext('2d')!.getImageData(0, 0, w, h).data;
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const imageSize = rowSize * h;
  const out = new Uint8Array(54 + imageSize);
  const v = new DataView(out.buffer);

  v.setUint16(0, 0x4d42, true); // "BM"
  v.setUint32(2, out.length, true);
  v.setUint32(10, 54, true);
  v.setUint32(14, 40, true); // BITMAPINFOHEADER
  v.setInt32(18, w, true);
  v.setInt32(22, h, true); // positive height = bottom-up rows
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);
  v.setUint32(34, imageSize, true);
  v.setInt32(38, 2835, true); // 72 DPI
  v.setInt32(42, 2835, true);

  for (let y = 0; y < h; y++) {
    let o = 54 + (h - 1 - y) * rowSize;
    for (let x = 0, i = y * w * 4; x < w; x++, i += 4) {
      out[o++] = px[i + 2];
      out[o++] = px[i + 1];
      out[o++] = px[i];
    }
  }
  return new Blob([out], { type: 'image/bmp' });
}

/** Multi-resolution ICO with PNG-compressed entries (supported since Windows Vista). */
async function encodeIco(src: Decoded, sizes: readonly number[]): Promise<Blob> {
  const list = [...new Set(sizes)].filter((s) => s > 0 && s <= 256).sort((a, b) => a - b);
  if (!list.length) list.push(32);

  const pngs = await Promise.all(
    list.map(async (size) => new Uint8Array(await (await canvasToBlob(fitSquare(src, size), 'image/png')).arrayBuffer())),
  );

  const headerSize = 6 + 16 * list.length;
  const out = new Uint8Array(headerSize + pngs.reduce((n, p) => n + p.length, 0));
  const v = new DataView(out.buffer);
  v.setUint16(2, 1, true); // type: icon
  v.setUint16(4, list.length, true);

  let offset = headerSize;
  list.forEach((size, i) => {
    const e = 6 + 16 * i;
    out[e] = out[e + 1] = size >= 256 ? 0 : size; // 0 means 256
    v.setUint16(e + 4, 1, true); // color planes
    v.setUint16(e + 6, 32, true); // bits per pixel
    v.setUint32(e + 8, pngs[i].length, true);
    v.setUint32(e + 12, offset, true);
    out.set(pngs[i], offset);
    offset += pngs[i].length;
  });
  return new Blob([out], { type: 'image/x-icon' });
}

/** Scales to fit a transparent square, centered. */
function fitSquare(src: Decoded, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const scale = Math.min(size / src.width, size / src.height);
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src.image, Math.floor((size - w) / 2), Math.floor((size - h) / 2), w, h);
  return canvas;
}

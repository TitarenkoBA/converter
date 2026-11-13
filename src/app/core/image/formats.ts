export type FormatId = 'jpg' | 'png' | 'webp' | 'avif' | 'gif' | 'bmp' | 'ico' | 'svg' | 'heic';

export interface ImageFormat {
  readonly id: FormatId;
  readonly label: string;
  /** First entry is the MIME type used when encoding. */
  readonly mimes: readonly string[];
  /** First entry is the extension used for output files. */
  readonly extensions: readonly string[];
  /** Can store transparency. Non-alpha targets get a background fill. */
  readonly alpha: boolean;
  /** Encoder accepts a quality setting. */
  readonly lossy: boolean;
}

export const FORMATS: Record<FormatId, ImageFormat> = {
  jpg: { id: 'jpg', label: 'JPG', mimes: ['image/jpeg', 'image/pjpeg'], extensions: ['jpg', 'jpeg', 'jfif'], alpha: false, lossy: true },
  png: { id: 'png', label: 'PNG', mimes: ['image/png', 'image/apng'], extensions: ['png', 'apng'], alpha: true, lossy: false },
  webp: { id: 'webp', label: 'WebP', mimes: ['image/webp'], extensions: ['webp'], alpha: true, lossy: true },
  avif: { id: 'avif', label: 'AVIF', mimes: ['image/avif'], extensions: ['avif'], alpha: true, lossy: true },
  gif: { id: 'gif', label: 'GIF', mimes: ['image/gif'], extensions: ['gif'], alpha: true, lossy: false },
  bmp: { id: 'bmp', label: 'BMP', mimes: ['image/bmp', 'image/x-ms-bmp'], extensions: ['bmp', 'dib'], alpha: false, lossy: false },
  ico: { id: 'ico', label: 'ICO', mimes: ['image/x-icon', 'image/vnd.microsoft.icon'], extensions: ['ico'], alpha: true, lossy: false },
  svg: { id: 'svg', label: 'SVG', mimes: ['image/svg+xml'], extensions: ['svg'], alpha: true, lossy: false },
  heic: { id: 'heic', label: 'HEIC', mimes: ['image/heic', 'image/heif'], extensions: ['heic', 'heif'], alpha: true, lossy: true },
};

export function acceptAttr(format: ImageFormat): string {
  return [...format.extensions.map((e) => `.${e}`), ...format.mimes].join(',');
}

/** Extension check first: HEIC and some others arrive with an empty `type` on Windows. */
export function matchesFormat(file: File, format: ImageFormat): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return format.extensions.includes(ext) || format.mimes.includes(file.type);
}

export function outputName(file: File, format: ImageFormat): string {
  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  return `${base}.${format.extensions[0]}`;
}

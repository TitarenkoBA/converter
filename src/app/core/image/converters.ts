import { FormatId } from './formats';

export interface ConverterDef {
  readonly slug: string;
  readonly from: FormatId;
  readonly to: FormatId;
}

/** Every pair becomes its own page at `/<from>-to-<to>`. */
const PAIRS: readonly (readonly [FormatId, FormatId])[] = [
  ['png', 'jpg'],
  ['webp', 'jpg'],
  ['heic', 'jpg'],
  ['avif', 'jpg'],
  ['svg', 'jpg'],
  ['bmp', 'jpg'],
  ['gif', 'jpg'],
  ['jpg', 'png'],
  ['webp', 'png'],
  ['heic', 'png'],
  ['avif', 'png'],
  ['svg', 'png'],
  ['gif', 'png'],
  ['bmp', 'png'],
  ['png', 'webp'],
  ['jpg', 'webp'],
  ['png', 'ico'],
  ['jpg', 'ico'],
  ['svg', 'ico'],
  ['png', 'bmp'],
  ['jpg', 'bmp'],
];

export const CONVERTERS: readonly ConverterDef[] = PAIRS.map(([from, to]) => ({
  slug: `${from}-to-${to}`,
  from,
  to,
}));

const TARGETS: readonly FormatId[] = ['jpg', 'png', 'webp', 'ico', 'bmp'];

export const CONVERTER_GROUPS = TARGETS.map((to) => ({
  to,
  items: CONVERTERS.filter((c) => c.to === to),
}));

import { Location, isPlatformBrowser } from '@angular/common';
import { DOCUMENT, Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, ResolveEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { storage } from '../storage';
import { de } from './dictionaries/de';
import { Dictionary, TKey, en } from './dictionaries/en';
import { es } from './dictionaries/es';
import { fr } from './dictionaries/fr';
import { it } from './dictionaries/it';
import { pl } from './dictionaries/pl';
import { pt } from './dictionaries/pt';
import { ru } from './dictionaries/ru';
import { zh } from './dictionaries/zh';

export type { TKey } from './dictionaries/en';

/** All dictionaries are bundled so switching language works offline. */
export const LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en_US', dict: en },
  { code: 'ru', name: 'Русский', locale: 'ru_RU', dict: ru },
  { code: 'de', name: 'Deutsch', locale: 'de_DE', dict: de },
  { code: 'fr', name: 'Français', locale: 'fr_FR', dict: fr },
  { code: 'es', name: 'Español', locale: 'es_ES', dict: es },
  { code: 'it', name: 'Italiano', locale: 'it_IT', dict: it },
  { code: 'pt', name: 'Português', locale: 'pt_BR', dict: pt },
  { code: 'pl', name: 'Polski', locale: 'pl_PL', dict: pl },
  { code: 'zh', name: '中文', locale: 'zh_CN', dict: zh },
] as const satisfies readonly { code: string; name: string; locale: string; dict: Dictionary }[];

export type LangCode = (typeof LANGUAGES)[number]['code'];

/** Served without a URL prefix; every other language lives under `/<code>/…`. */
export const DEFAULT_LANG: LangCode = 'en';

const STORAGE_KEY = 'converter.lang';

export type TParams = Readonly<Record<string, string | number>>;

export function isLangCode(code: string): code is LangCode {
  return LANGUAGES.some((l) => l.code === code);
}

/** Builds the URL of a page (path without language prefix, '' for the landing) in a language. */
export function localizedPath(page: string, lang: LangCode): string {
  const prefix = lang === DEFAULT_LANG ? '' : `/${lang}`;
  return page ? `${prefix}/${page}` : prefix || '/';
}

/** Splits `/ru/png-to-jpg?x` into its language and page path. */
export function parsePath(url: string): { lang: LangCode; page: string } {
  const segments = url.split(/[?#]/)[0].split('/').filter(Boolean);
  if (segments.length && segments[0] !== DEFAULT_LANG && isLangCode(segments[0])) {
    return { lang: segments[0], page: segments.slice(1).join('/') };
  }
  return { lang: DEFAULT_LANG, page: segments.join('/') };
}

/**
 * The language comes from the URL, so every language version is a separate,
 * indexable page. The user's choice is remembered and applied on the next visit.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Path without the base href, so the app also works from a sub-path (e.g. GitHub Pages `/repo/`). */
  private readonly initial = parsePath(inject(Location).path());
  readonly lang = signal<LangCode>(this.initial.lang);
  /** Current page without the language prefix, '' for the landing. */
  readonly page = signal(this.initial.page);
  readonly language = computed(() => LANGUAGES.find((l) => l.code === this.lang())!);
  private readonly dict = computed<Dictionary>(() => this.language().dict);

  constructor() {
    const doc = inject(DOCUMENT);
    effect(() => (doc.documentElement.lang = this.lang()));

    // ResolveEnd fires before the new page is created, so it renders in the right language.
    this.router.events.pipe(filter((e) => e instanceof ResolveEnd)).subscribe((e) => {
      const { lang, page } = parsePath(e.urlAfterRedirects);
      this.lang.set(lang);
      this.page.set(page);
    });

    if (this.isBrowser) {
      this.router.events
        .pipe(
          filter((e) => e instanceof NavigationEnd),
          take(1),
        )
        .subscribe(() => this.applyPreferredLanguage());
    }
  }

  t(key: TKey, params?: TParams): string {
    const text = this.dict()[key] ?? en[key];
    return params ? text.replace(/\{(\w+)\}/g, (m, name: string) => String(params[name] ?? m)) : text;
  }

  /** URL of a page in the current (or given) language. */
  path(page = '', lang: LangCode = this.lang()): string {
    return localizedPath(page, lang);
  }

  setLang(code: string): void {
    if (!isLangCode(code)) return;
    this.remember(code);
    void this.router.navigateByUrl(this.path(this.page(), code));
  }

  /** Saves an explicit choice so the next visit opens in this language. */
  remember(code: LangCode): void {
    storage.set(STORAGE_KEY, code);
  }

  formatBytes(bytes: number): string {
    const [value, unit] = bytes >= 1024 * 1024 ? [bytes / 1024 / 1024, 'megabyte'] : [bytes / 1024, 'kilobyte'];
    return new Intl.NumberFormat(this.lang(), { style: 'unit', unit, maximumFractionDigits: 1 }).format(value);
  }

  /**
   * Visitors landing on a default-language URL are moved to their saved or browser language.
   * Explicit language URLs (`/ru/…`) are always respected.
   */
  private applyPreferredLanguage(): void {
    if (this.lang() !== DEFAULT_LANG) return;
    const stored = storage.get(STORAGE_KEY);
    const preferred = stored && isLangCode(stored) ? stored : browserLang();
    if (preferred !== DEFAULT_LANG) {
      void this.router.navigateByUrl(this.path(this.page(), preferred), { replaceUrl: true });
    }
  }
}

function browserLang(): LangCode {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLangCode(base)) return base;
  }
  return DEFAULT_LANG;
}

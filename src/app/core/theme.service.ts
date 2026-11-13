import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, DestroyRef, Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { storage } from './storage';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Must match the inline script in index.html that applies the theme before first paint. */
const STORAGE_KEY = 'converter.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly mode = signal<ThemeMode>(readMode());
  private readonly systemDark = signal(false);
  readonly dark = computed(() => (this.mode() === 'system' ? this.systemDark() : this.mode() === 'dark'));

  constructor() {
    // Prerendered HTML stays theme-neutral; the inline script in index.html sets it before paint.
    if (!this.isBrowser) return;

    const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (media) {
      this.systemDark.set(media.matches);
      const onChange = (e: MediaQueryListEvent) => this.systemDark.set(e.matches);
      media.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => media.removeEventListener('change', onChange));
    }

    effect(() => {
      const root = this.doc.documentElement;
      root.classList.toggle('dark', this.dark());
      root.style.colorScheme = this.dark() ? 'dark' : 'light';
      this.doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', this.dark() ? '#020617' : '#4f46e5');
    });
  }

  /** Cycles system → light → dark. */
  toggle(): void {
    const next: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
    this.set(next[this.mode()]);
  }

  set(mode: ThemeMode): void {
    storage.set(STORAGE_KEY, mode === 'system' ? null : mode);
    this.mode.set(mode);
  }
}

function readMode(): ThemeMode {
  const stored = storage.get(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

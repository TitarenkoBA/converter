import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import site from '../../../site.config.json';
import { DEFAULT_LANG, I18n, LANGUAGES, localizedPath } from './i18n/i18n.service';

export const SITE_URL = site.url.replace(/\/$/, '');
export const SITE_NAME = site.name;

export interface PageSeo {
  readonly title: string;
  readonly description: string;
  /** Page path without language prefix, '' for the landing. */
  readonly page: string;
  readonly jsonLd?: readonly object[];
}

export function absoluteUrl(path: string): string {
  return SITE_URL + (path === '/' ? '/' : path);
}

/** Writes all head tags for a page. Runs during prerendering, so crawlers get them as static HTML. */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18n);

  update({ title, description, page, jsonLd = [] }: PageSeo): void {
    const lang = this.i18n.lang();
    const url = absoluteUrl(localizedPath(page, lang));
    const image = `${SITE_URL}/icons/icon-512x512.png`;

    this.title.setTitle(title);
    const tags: Record<string, string> = {
      'name=description': description,
      'name=robots': 'index, follow, max-image-preview:large',
      'property=og:type': 'website',
      'property=og:site_name': SITE_NAME,
      'property=og:title': title,
      'property=og:description': description,
      'property=og:url': url,
      'property=og:image': image,
      'property=og:locale': this.i18n.language().locale,
      'name=twitter:card': 'summary',
      'name=twitter:title': title,
      'name=twitter:description': description,
      'name=twitter:image': image,
    };
    for (const [selector, content] of Object.entries(tags)) {
      const [attr, value] = selector.split('=');
      this.meta.updateTag({ [attr]: value, content }, `${attr}="${value}"`);
    }

    this.doc.head.querySelectorAll('[data-seo]').forEach((el) => el.remove());
    this.addLink({ rel: 'canonical', href: url });
    for (const l of LANGUAGES) {
      this.addLink({ rel: 'alternate', hreflang: l.code, href: absoluteUrl(localizedPath(page, l.code)) });
    }
    this.addLink({ rel: 'alternate', hreflang: 'x-default', href: absoluteUrl(localizedPath(page, DEFAULT_LANG)) });

    for (const data of jsonLd) {
      const script = this.doc.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', '');
      script.textContent = JSON.stringify({ '@context': 'https://schema.org', ...data });
      this.doc.head.appendChild(script);
    }
  }

  private addLink(attrs: Record<string, string>): void {
    const link = this.doc.createElement('link');
    for (const [k, v] of Object.entries(attrs)) link.setAttribute(k, v);
    link.setAttribute('data-seo', '');
    this.doc.head.appendChild(link);
  }
}

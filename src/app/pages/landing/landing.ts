import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n, TKey } from '../../core/i18n/i18n.service';
import { CONVERTER_GROUPS, CONVERTERS } from '../../core/image/converters';
import { FORMATS } from '../../core/image/formats';
import { SITE_NAME, SITE_URL, Seo, absoluteUrl } from '../../core/seo.service';

const FEATURES = [
  { key: 'private', icon: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z' },
  { key: 'offline', icon: 'M3 3l18 18M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z' },
  { key: 'fast', icon: 'm3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z' },
  { key: 'free', icon: 'M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z' },
  { key: 'install', icon: 'M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3' },
  { key: 'quality', icon: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75' },
] as const;

const FAQ = [1, 2, 3, 4, 5] as const;
const STEPS = [1, 2, 3] as const;
const POPULAR = ['heic-to-jpg', 'png-to-jpg', 'webp-to-png', 'jpg-to-png', 'png-to-ico', 'webp-to-jpg'];

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.html',
})
export class Landing {
  protected readonly i18n = inject(I18n);
  protected readonly groups = CONVERTER_GROUPS;
  protected readonly formats = FORMATS;
  protected readonly features = FEATURES;
  protected readonly faq = FAQ;
  protected readonly steps = STEPS;
  protected readonly popular = POPULAR.map((slug) => CONVERTERS.find((c) => c.slug === slug)!);

  constructor() {
    const seo = inject(Seo);
    effect(() => {
      const t = (k: TKey) => this.i18n.t(k);
      const url = absoluteUrl(this.i18n.path(''));
      seo.update({
        title: t('seo.home.title'),
        description: t('seo.home.description'),
        page: '',
        jsonLd: [
          { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL, inLanguage: this.i18n.lang() },
          {
            '@type': 'WebApplication',
            name: SITE_NAME,
            url,
            description: t('seo.home.description'),
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript',
            inLanguage: this.i18n.lang(),
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
          {
            '@type': 'FAQPage',
            mainEntity: FAQ.map((n) => ({
              '@type': 'Question',
              name: t(`landing.faq.q${n}`),
              acceptedAnswer: { '@type': 'Answer', text: t(`landing.faq.a${n}`) },
            })),
          },
        ],
      });
    });
  }

  protected featureKey(key: string, part: 'title' | 'text'): TKey {
    return `landing.feature.${key}.${part}` as TKey;
  }

  protected stepKey(n: number, part: 'title' | 'text'): TKey {
    return `landing.how.step${n}.${part}` as TKey;
  }

  protected faqKey(n: number, part: 'q' | 'a'): TKey {
    return `landing.faq.${part}${n}` as TKey;
  }
}

import { Routes } from '@angular/router';
import { DEFAULT_LANG, LANGUAGES } from './core/i18n/i18n.service';
import { CONVERTERS } from './core/image/converters';
import { FEATURES } from './core/pro/features';

/** Pages shared by every language. The language itself is read from the URL by I18n. */
const pages: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing) },
  ...CONVERTERS.map((converter) => ({
    path: converter.slug,
    loadComponent: () => import('./pages/converter/converter-page').then((m) => m.ConverterPage),
    data: { converter },
  })),
];

export const routes: Routes = [
  {
    path: 'pricing',
    canMatch: [() => FEATURES.paymentsEnabled],
    loadComponent: () => import('./pages/pricing/pricing').then((m) => m.Pricing),
  },
  // `/ru/...`, `/de/...` etc.; the default language has no prefix.
  ...LANGUAGES.filter((l) => l.code !== DEFAULT_LANG).map((l) => ({ path: l.code, children: pages })),
  { path: '', children: pages },
  { path: '**', redirectTo: '' },
];

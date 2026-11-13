import { RenderMode, ServerRoute } from '@angular/ssr';

/** Every page is prerendered to static HTML at build time (SEO); there is no runtime server. */
export const serverRoutes: ServerRoute[] = [
  { path: 'pricing', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];

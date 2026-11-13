// Runs after `ng build`: writes sitemap.xml (with hreflang alternates), robots.txt and 404.html
// next to the prerendered pages. Pages are discovered from the build output itself.
import { copyFileSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'dist/converter/browser');
const site = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const base = site.url.replace(/\/$/, '');
const DEFAULT_LANG = 'en';

/** Every prerendered page: `<dir>/index.html` -> URL path. */
function pages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return pages(full);
    if (name !== 'index.html') return [];
    const path = relative(out, dir).split(sep).join('/');
    return [path ? `/${path}` : '/'];
  });
}

// Group language versions of the same page: '/ru/png-to-jpg' -> page 'png-to-jpg', lang 'ru'.
const langDirs = new Set(
  readdirSync(out).filter((d) => /^[a-z]{2}$/.test(d) && statSync(join(out, d)).isDirectory()),
);
const byPage = new Map();
for (const url of pages(out)) {
  const [first, ...rest] = url.split('/').filter(Boolean);
  const [lang, page] = langDirs.has(first) ? [first, rest.join('/')] : [DEFAULT_LANG, url.slice(1)];
  if (!byPage.has(page)) byPage.set(page, new Map());
  byPage.get(page).set(lang, base + (url === '/' ? '/' : url));
}

const today = new Date().toISOString().slice(0, 10);
const entries = [...byPage.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([page, versions]) => {
    const alternates = [...versions.entries()]
      .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`)
      .concat(versions.has(DEFAULT_LANG) ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${versions.get(DEFAULT_LANG)}"/>`] : [])
      .join('\n');
    return [...versions.values()].map(
      (loc) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${page ? '0.8' : '1.0'}</priority>
${alternates}
  </url>`,
    );
  });

writeFileSync(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`,
);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);

// Static hosts without rewrites (GitHub Pages) serve 404.html for unknown paths:
// the client-side shell boots the app there, and the router redirects to the landing.
copyFileSync(join(out, 'index.csr.html'), join(out, '404.html'));

console.log(`SEO: sitemap.xml with ${entries.length} URLs, robots.txt, 404.html -> ${base}`);

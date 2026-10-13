import { writeFileSync, readdirSync } from 'node:fs';
import { isStaging, sitemapXml, robotsTxt } from './seo.mjs';

// Cloudflare provides the branch name for both production and preview builds.
// Only the deploy branch may be indexed on a custom domain.
const branch = process.env.CF_PAGES_BRANCH;
const staging = isStaging();
const rules = staging
  ? '/*\n  X-Robots-Tag: noindex, nofollow\n'
  : 'https://:project.pages.dev/*\n  X-Robots-Tag: noindex\n\nhttps://:version.:project.pages.dev/*\n  X-Robots-Tag: noindex\n';

writeFileSync(new URL('../dist/_headers', import.meta.url), rules);
const paths = readdirSync(new URL('../dist/', import.meta.url), { recursive: true }).filter(file => file.endsWith('.html')).map(file => `/${file}`);
writeFileSync(new URL('../dist/sitemap.xml', import.meta.url), sitemapXml(paths));
writeFileSync(new URL('../dist/robots.txt', import.meta.url), robotsTxt());
console.log(staging
  ? `Cloudflare: indexing disabled for ${branch || 'unidentified Cloudflare build'}.`
  : 'Cloudflare: custom domains may be indexed; pages.dev copies are noindex.');

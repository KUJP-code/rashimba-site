import { writeFileSync, readdirSync, rmSync } from 'node:fs';
import { isStaging, sitemapXml, robotsTxt } from './seo.mjs';

const amplify = Boolean(process.env.AWS_APP_ID || process.env.AWS_BRANCH);
const cloudflare = !amplify && Boolean(process.env.CF_PAGES || process.env.CF_PAGES_BRANCH);
const branch = process.env.AWS_BRANCH || process.env.CF_PAGES_BRANCH;
const staging = isStaging();
const rules = staging
  ? '/*\n  X-Robots-Tag: noindex, nofollow\n'
  : 'https://:project.pages.dev/*\n  X-Robots-Tag: noindex\n\nhttps://:version.:project.pages.dev/*\n  X-Robots-Tag: noindex\n';

// _headers is Cloudflare-specific. Amplify reads the root customHttp.yml instead.
const headersFile = new URL('../dist/_headers', import.meta.url);
if (cloudflare) writeFileSync(headersFile, rules);
else rmSync(headersFile, { force: true });
const paths = readdirSync(new URL('../dist/', import.meta.url), { recursive: true }).filter(file => file.endsWith('.html')).map(file => `/${file}`);
writeFileSync(new URL('../dist/sitemap.xml', import.meta.url), sitemapXml(paths));
writeFileSync(new URL('../dist/robots.txt', import.meta.url), robotsTxt());
const host = amplify ? 'Amplify' : cloudflare ? 'Cloudflare' : 'Static build';
console.log(staging
  ? `${host}: indexing and analytics disabled for ${branch || 'unidentified hosted build'}.`
  : `${host}: production metadata and sitemap use the official custom domain.`);

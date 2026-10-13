import { existsSync, openSync, readSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const siteName = 'らしんば';
export const defaultSiteUrl = 'https://rashimba.com';

export function siteOrigin(value = process.env.SITE_URL || defaultSiteUrl) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password || url.port || url.hostname.endsWith('.pages.dev')) {
    throw new Error('SITE_URL must be the HTTPS origin of the official custom domain, such as https://rashimba.com');
  }
  return url.origin;
}

export function isStaging(env = process.env) {
  return env.CF_PAGES_BRANCH ? env.CF_PAGES_BRANCH !== 'deploy' : env.CF_PAGES === '1';
}

export function canonicalPath(path) {
  const pathname = path.split(/[?#]/)[0].replace(/\/index\.html$/, '/');
  return pathname === '/' || /\.[a-z0-9]+$/i.test(pathname) ? pathname : `${pathname.replace(/\/$/, '')}/`;
}

export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const decodeHtml = value => value.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" })[entity]);
export const plainText = html => decodeHtml(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
const jsonLd = data => JSON.stringify(data).replace(/</g, '\\u003c');
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const imageDimensions = new Map();

function optimizeImages(html) {
  const optimized = html.replace(/(<img\b[^>]*\bsrc=")(\/assets\/[^"?#]+)\.png("[^>]*>)/g, (match, before, asset, after) => {
    const png = resolve(publicDir, `.${asset}.png`);
    if (existsSync(png) && !/\bwidth=/.test(match) && !/\bheight=/.test(match)) {
      if (!imageDimensions.has(png)) {
        const descriptor = openSync(png, 'r');
        const header = Buffer.alloc(24);
        try { readSync(descriptor, header, 0, 24, 0); } finally { closeSync(descriptor); }
        imageDimensions.set(png, [header.readUInt32BE(16), header.readUInt32BE(20)]);
      }
      const [width, height] = imageDimensions.get(png);
      after = after.replace(/\s*\/?>$/, ` width="${width}" height="${height}" />`);
    }
    const extension = existsSync(resolve(publicDir, `.${asset}.webp`)) ? 'webp' : 'png';
    return `${before}${asset}.${extension}${after}`;
  });
  return optimized.replace(/(<source\b[^>]*\bsrcset=")([^"]+)(")/g, (_, before, sources, after) => before + sources.replace(/(\/assets\/[^,\s]+)\.png(?=\s|,|$)/g, (match, asset) => existsSync(resolve(publicDir, `.${asset}.webp`)) ? `${asset}.webp` : match) + after);
}

export function seoHtml(html, { path = '/', server = null } = {}, articles = []) {
  const origin = siteOrigin();
  const pathname = canonicalPath(path);
  const url = `${origin}${pathname}`;
  const title = plainText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || siteName);
  const description = decodeHtml(html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] || '完全無料の子ども向け英語学習アプリ「らしんば」の公式サイト。');
  const notFound = pathname === '/404.html';
  const article = articles.find(item => pathname === `/news/${item.slug}/`);
  const robots = isStaging() || server || notFound ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
  const image = `${origin}/assets/social-preview.jpg`;
  const graph = [];

  if (!notFound) {
    const publisher = {
      '@type': 'Organization', '@id': `${origin}/#publisher`,
      name: '株式会社Kids-UP', url: 'https://kids-up.jp/',
    };
    if (pathname === '/') graph.push(publisher, {
      '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`,
      name: siteName, alternateName: 'Rashimba', inLanguage: 'ja', publisher: { '@id': publisher['@id'] },
      image,
    });
    graph.push({
      '@type': article ? 'Article' : 'WebPage', '@id': `${url}#page`, url,
      name: title, description, inLanguage: 'ja', isPartOf: { '@id': `${origin}/#website` },
      ...(article ? {
        headline: article.title, datePublished: article.date,
        author: { '@type': 'Organization', name: publisher.name, url: publisher.url },
        publisher, mainEntityOfPage: url,
      } : {}),
    });
    if (['/contact/', '/privacy/', '/news/'].includes(pathname) || article) {
      const items = [{ name: 'トップ', item: `${origin}/` }];
      if (article) items.push({ name: 'お知らせ一覧', item: `${origin}/news/` });
      items.push({ name: article?.title || plainText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || title), item: url });
      graph.push({ '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })) });
    }
  }

  const metadata = [
    `<meta name="robots" content="${robots}" />`,
    ...(notFound ? [] : [`<link rel="canonical" href="${escapeHtml(url)}" />`]),
    '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />',
    '<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
    `<meta property="og:site_name" content="${siteName}" />`,
    '<meta property="og:locale" content="ja_JP" />',
    `<meta property="og:type" content="${article ? 'article' : 'website'}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    ...(notFound ? [] : [`<meta property="og:url" content="${escapeHtml(url)}" />`]),
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:type" content="image/jpeg" />',
    '<meta property="og:image:alt" content="らしんばの街とキャラクターたち" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:image:alt" content="らしんばの街とキャラクターたち" />',
    ...(graph.length ? [`<script type="application/ld+json">${jsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script>`] : []),
  ].join('\n    ');
  return optimizeImages(html.replace('</head>', `    ${metadata}\n  </head>`));
}

export function sitemapXml(paths, { origin = siteOrigin(), staging = isStaging() } = {}) {
  const locations = staging ? [] : [...new Set(paths.map(canonicalPath))].filter(path => path !== '/404.html');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations.map(path => `  <url><loc>${escapeHtml(origin + path)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function robotsTxt({ origin = siteOrigin(), staging = isStaging() } = {}) {
  return `User-agent: *\nAllow: /\n${staging ? '# Staging is excluded by noindex response headers and page metadata.\n' : `\nSitemap: ${origin}/sitemap.xml\n`}`;
}

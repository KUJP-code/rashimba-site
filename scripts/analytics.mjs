import { canonicalPath, escapeHtml, isStaging, siteOrigin } from './seo.mjs';

export function analyticsHtml(html, { server = null, path = '/' } = {}, env = process.env) {
  const measurementId = env.GA_MEASUREMENT_ID ?? 'G-42DRXRM7E2';
  // The standalone terms page is also embedded in the app's WebView.
  if (server || isStaging(env) || !measurementId || canonicalPath(path) === '/terms/') return html;
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) throw new Error('GA_MEASUREMENT_ID must be a GA4 measurement ID (G-...).');
  return html.replace('</head>', `    <meta name="rashimba-analytics" content="${measurementId}" data-origin="${escapeHtml(siteOrigin(env.SITE_URL))}" />
    <script type="module" src="/src/analytics.js"></script>\n  </head>`);
}

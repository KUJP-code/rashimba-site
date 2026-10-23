const clients = new WeakMap();
const leadTypes = new Set(['sponsor_inquiry', 'release_notification']);

function cleanUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin + url.pathname : '';
  } catch {
    return '';
  }
}

export function initAnalytics({ measurementId, origin }, browser = window, page = document) {
  // Production artifacts can also be served on preview domains or localhost.
  if (browser.location.origin !== origin || clients.has(browser)) return;
  browser.dataLayer = browser.dataLayer || [];
  browser.gtag = browser.gtag || function () { browser.dataLayer.push(arguments); };
  const config = {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: cleanUrl(browser.location.href),
    page_referrer: cleanUrl(page.referrer),
  };
  // Preserve standard campaign attribution without forwarding arbitrary URL parameters.
  const params = new URL(browser.location.href).searchParams;
  for (const [utm, field] of Object.entries({
    utm_id: 'campaign_id', utm_source: 'campaign_source', utm_medium: 'campaign_medium',
    utm_campaign: 'campaign_name', utm_term: 'campaign_term', utm_content: 'campaign_content',
  })) {
    if (params.has(utm)) config[field] = params.get(utm);
  }
  browser.gtag('js', new Date());
  // The config command sends the single initial page_view for this document.
  browser.gtag('config', measurementId, config);
  const script = page.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  page.head.append(script);
  clients.set(browser, measurementId);
}

export function trackLead(leadType, browser = window) {
  const measurementId = clients.get(browser);
  if (!measurementId || !leadTypes.has(leadType)) return;
  browser.gtag('event', 'generate_lead', { send_to: measurementId, lead_type: leadType });
}

// Initialize as a dependency before page behavior runs, even when Vite merges entries.
// A failed analytics initialization must not prevent navigation or form setup.
if (typeof document !== 'undefined') {
  const settings = document.querySelector('meta[name="rashimba-analytics"]');
  if (settings) {
    try { initAnalytics({ measurementId: settings.content, origin: settings.dataset.origin }); }
    catch { /* The website remains usable when analytics is unavailable. */ }
  }
}

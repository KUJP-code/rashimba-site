import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsHtml } from '../scripts/analytics.mjs';
import { initAnalytics, trackLead } from '../src/analytics.js';

const config = { measurementId: 'G-42DRXRM7E2', origin: 'https://rashimba.com' };
const html = '<html><head><title>Rashimba</title></head><body></body></html>';

function browserAt(url = 'https://rashimba.com/parents/') {
  const scripts = [];
  const browser = { location: new URL(url) };
  const page = {
    referrer: 'https://example.com/article/?email=parent@example.com#private',
    createElement: () => ({}),
    head: { append: script => scripts.push(script) },
  };
  return { browser, page, scripts };
}

test('shared HTML includes production tracking on website pages, with a configurable ID', () => {
  for (const path of ['/', '/parents/index.html', '/contact/', '/privacy/', '/news/update/', '/404.html']) {
    const output = analyticsHtml(html, { path }, {});
    assert.match(output, /name="rashimba-analytics" content="G-42DRXRM7E2" data-origin="https:\/\/rashimba.com"/);
    assert.ok(output.indexOf('/src/analytics.js') < output.indexOf('</head>'));
  }
  assert.match(analyticsHtml(html, {}, { GA_MEASUREMENT_ID: 'G-OTHER123' }), /G-OTHER123/);
  assert.throws(() => analyticsHtml(html, {}, { GA_MEASUREMENT_ID: 'GTM-123' }));
});

test('development, staging, disabled builds, and app terms receive no analytics bootstrap', () => {
  for (const [context, env] of [
    [{ server: {} }, {}], [{}, { CF_PAGES_BRANCH: 'staging' }],
    [{}, { CF_PAGES: '1' }], [{}, { GA_MEASUREMENT_ID: '' }],
    [{}, { AWS_BRANCH: 'staging' }], [{}, { AWS_APP_ID: 'app' }],
    [{}, { AWS_BRANCH: 'deploy', AWS_PULL_REQUEST_ID: '42' }],
    [{ path: '/terms/index.html' }, {}], [{ path: '/terms/' }, {}],
  ]) assert.equal(analyticsHtml(html, context, env), html);
  assert.notEqual(analyticsHtml(html, {}, { CF_PAGES_BRANCH: 'deploy' }), html);
  assert.notEqual(analyticsHtml(html, {}, { AWS_BRANCH: 'deploy' }), html);
});

test('runtime origin guard prevents both script loading and lead events on preview hosts', () => {
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:4173', 'https://preview.pages.dev', 'https://deploy.d3dwlzdpsg55wr.amplifyapp.com', 'https://staging.rashimba.com']) {
    const { browser, page, scripts } = browserAt(`${origin}/parents/`);
    initAnalytics(config, browser, page);
    trackLead('release_notification', browser);
    assert.equal(scripts.length, 0);
    assert.equal(browser.dataLayer, undefined);
  }
});

test('initialization is idempotent and queues exactly one config before asynchronously loading Google', () => {
  const { browser, page, scripts } = browserAt();
  page.head.append = script => {
    assert.equal(browser.dataLayer.length, 2);
    scripts.push(script);
  };
  initAnalytics(config, browser, page);
  initAnalytics(config, browser, page);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].async, true);
  assert.equal(scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-42DRXRM7E2');
  assert.deepEqual(browser.dataLayer.map(command => command[0]), ['js', 'config']);
  assert.equal(browser.dataLayer[1][1], config.measurementId);
  assert.equal(browser.dataLayer[1][2].send_page_view, undefined);
});

test('configuration strips URL queries and fragments, retains UTM attribution, and disables ad personalization', () => {
  const { browser, page } = browserAt('https://rashimba.com/parents/?utm_source=newsletter&utm_campaign=launch&email=parent@example.com#signup');
  initAnalytics(config, browser, page);
  assert.deepEqual(browser.dataLayer[1][2], {
    allow_google_signals: false, allow_ad_personalization_signals: false,
    page_location: 'https://rashimba.com/parents/', page_referrer: 'https://example.com/article/',
    campaign_source: 'newsletter', campaign_name: 'launch',
  });
  const direct = browserAt();
  direct.page.referrer = '';
  initAnalytics(config, direct.browser, direct.page);
  assert.equal(direct.browser.dataLayer[1][2].page_referrer, '');
});

test('lead reporting works while Google is blocked and only queues approved form types without form data', () => {
  const { browser, page } = browserAt();
  trackLead('sponsor_inquiry', browser);
  assert.equal(browser.dataLayer, undefined);
  initAnalytics(config, browser, page);
  for (const type of ['sponsor_inquiry', 'release_notification', 'parent@example.com']) trackLead(type, browser);
  assert.deepEqual(browser.dataLayer.slice(2).map(command => [...command]), [
    ['event', 'generate_lead', { send_to: config.measurementId, lead_type: 'sponsor_inquiry' }],
    ['event', 'generate_lead', { send_to: config.measurementId, lead_type: 'release_notification' }],
  ]);
});

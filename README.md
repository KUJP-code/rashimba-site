# らしんば — For Sponsor & For Parents

Responsive static implementation of the **Draft v3** sponsor and parent pages, built with Vite, plain HTML, SCSS, and a small amount of vanilla JavaScript.

## Run locally

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to any static host. No backend or runtime framework is required.

SEO metadata, canonical URLs, structured data, `sitemap.xml`, and `robots.txt` are generated at build time for `https://rashimba.com`. Set `SITE_URL` to change the official HTTPS origin. Amplify builds from `deploy` allow indexing; other branches and pull-request previews receive `noindex`, an empty sitemap, and no analytics bootstrap. Optimized WebP copies are served where available, while the original Figma assets are retained. Run `node --test tests/*.test.*` for the analytics, SEO, and form checks.

## AWS Amplify hosting and SEO

The live app is **`rashimba-site`** (`d3dwlzdpsg55wr`, region `ap-northeast-1`), with the **`deploy`** branch serving `https://rashimba.com`. The working `staging` branch is not a production deployment. `amplify.yml` records the Node 22 / `npm ci` build, runs the tests, and publishes `dist/`.

`scripts/seo.mjs` reads Amplify's `AWS_BRANCH` and `AWS_PULL_REQUEST_ID`. Only the production branch can be indexed; a pull-request build remains a preview even when it targets `deploy`. An Amplify build with an app ID but no branch name fails closed to `noindex`. If the production branch changes, set `SITE_PRODUCTION_BRANCH` accordingly (default `deploy`). `SITE_URL` must be the official HTTPS custom-domain origin; `amplifyapp.com` and `pages.dev` addresses are rejected as canonical origins. Preview HTML uses `noindex` rather than blocking crawlers in `robots.txt`, so crawlers can read that directive. Existing Cloudflare environment detection remains supported for legacy builds; the Cloudflare-only `_headers` file is not emitted for Amplify.

Amplify uses the root **`customHttp.yml`**, rather than Cloudflare's `_headers`. The policy gives HTML, sitemaps, and unversioned content a five-minute CDN cache with browser revalidation, while Vite's versioned scripts, styles, and fonts receive a one-year immutable cache. The `/404.html` response also gets `X-Robots-Tag: noindex, nofollow`. AWS applies these headers after deployment; see the [Amplify custom-header documentation](https://docs.aws.amazon.com/amplify/latest/userguide/setting-custom-headers.html).

**Routing rules are managed separately from the build.** `hosting/amplify-redirects.json` records the rules applied to the live app on October 22, 2026:

- `www.rashimba.com` and the production `deploy.d3dwlzdpsg55wr.amplifyapp.com` hostname permanently redirect to `rashimba.com`, preserving page paths and query parameters. Future preview hostnames are not redirected to production.
- Explicit `/index.html` aliases redirect to their canonical directory URLs; Amplify handles trailing slashes for directory indexes.
- The last `404-200` rule rewrites missing URLs to the branded `/404.html`. Despite its API name, this was verified on this static Amplify app to return **HTTP 404**, retain the requested URL, and render the branded error page. The previous `404` rule issued a 302 redirect to a 200 error page. Do not replace this with a catch-all `200` rewrite to `/index.html`: this is a multi-page site.

The JSON file is a record of app-level configuration; Amplify does **not** automatically load it from Git. To reapply it after an intentional routing change:

```sh
aws amplify update-app --app-id d3dwlzdpsg55wr --region ap-northeast-1 \
  --custom-rules file://hosting/amplify-redirects.json
```

After deploying source/header changes, verify the official homepage, parent page, an article, `/robots.txt`, and `/sitemap.xml` return 200 with the intended cache headers. Confirm `www` and the production Amplify hostname return 301 to the corresponding official URL, and a fresh missing URL returns 404 with the branded page and no redirect. Preview builds must have `noindex`, an empty sitemap, and no analytics. Submit the official sitemap in Google Search Console if not already submitted; hosting migration does not change its URL. The titles, canonical URLs, and structured data remain independent of the hosting provider. See AWS's [redirect examples](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html) and [environment-variable reference](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html).

## Website analytics (GA4)

The website uses the direct Google tag for **`G-42DRXRM7E2`**. `scripts/analytics.mjs` adds a shared bootstrap to the HTML head during production builds; `src/analytics.js` loads Google's script asynchronously and initializes it once per document. There is no Google Tag Manager container or additional analytics dependency. Do not also paste a GA snippet into a footer or enable a second GA integration on the host, since that can double-count visits.

Analytics starts immediately, without a consent banner, as requested by the site owner based on the existing policy. Google Signals and advertising personalization signals are disabled. The tag only loads on the exact official origin (`https://rashimba.com`, or the `SITE_URL` override). Local development, local production previews, Amplify/Cloudflare preview domains, non-production branches, and Amplify pull-request builds do not send analytics. The standalone `/terms/` page remains untracked because it is embedded in the app's WebView. This configuration is for the public website, not the app itself.

The public measurement ID defaults to the value above. Override it with the build environment variable `GA_MEASUREMENT_ID`. Setting that variable to an empty string disables tracking after a rebuild and deployment. These build variables are read from the process environment (the shell or Amplify environment settings), not Vite's `.env` files. For example:

```sh
GA_MEASUREMENT_ID='' npm run build
```

### Measurement plan

| Event | Trigger | Parameters added by this site |
| --- | --- | --- |
| `page_view` | Google's initial config command, once per tracked page load | Clean page URL and referrer; standard UTM campaign values when supplied |
| `generate_lead` | Sponsor inquiry API returns HTTP 202 with `status: accepted` | `lead_type: sponsor_inquiry` |
| `generate_lead` | Release-notification API returns HTTP 202 with `status: accepted` | `lead_type: release_notification` |

The custom events never receive form values, API responses, submission UUIDs, or CAPTCHA tokens. Page location and referrer configuration omit query strings and fragments; the six standard `utm_*` campaign parameters are mapped separately for attribution. Keep personal information out of campaign values and link URLs. Google's enhanced measurement has additional automatic collection controlled in GA4, so review those settings as described below. A successful API response measures acceptance, not eventual email delivery; a response lost after server acceptance may leave that lead uncounted. Blocked analytics does not prevent form submission or change the success message.

### GA4 setup and deployment verification

1. In **Admin → Data streams**, select the Rashimba web stream and confirm its measurement ID is `G-42DRXRM7E2` and its website URL is `https://rashimba.com`.
2. Open the stream's **Enhanced measurement** settings. Keep page-load views enabled; disable **Page changes based on browser history events** for this multi-page site. Disable **Form interactions** so raw submit attempts are not confused with API-accepted leads. Review the other automatic events for the data you want to collect. Leave automatic user-provided data collection off.
3. In **Admin → Custom definitions**, create an event-scoped custom dimension named **Lead type**, using event parameter **`lead_type`**. Mark **`generate_lead`** as a key event if accepted inquiries and notification registrations are conversions you want to report together.
4. Run `node --test tests/*.test.*` and `npm run build`, then deploy through the existing Amplify workflow on the `deploy` branch. A preview URL intentionally cannot confirm live collection.
5. Open the deployed official domain in a browser without an analytics-blocking extension. In DevTools **Network**, confirm one `gtag/js?id=G-42DRXRM7E2` script request and a `g/collect` request with `tid=G-42DRXRM7E2` and `en=page_view`. Navigate between `/` and `/parents/` and confirm a single initial page-view event for each full page load. Multiple collection requests can occur for other event types.
6. Use [Google Tag Assistant](https://tagassistant.google.com/) and GA4 **Realtime / DebugView** to confirm receipt. Check the cleaned page URL/referrer and UTM attribution in event details. Verify localhost and Amplify preview visits produce no Google tag or collection requests.
7. For a conversion check, use an approved test inquiry: a real submission saves a record and queues email. Confirm exactly one `generate_lead` with the correct `lead_type` after success; validation or API errors should produce none. The automated tests mock the API and do not send email.

Live collection and GA4 account settings require verification after deployment; a passing local build cannot confirm Google's receipt. Standard GA4 reports can take 24–48 hours to process data. See Google's [page-view behavior](https://developers.google.com/analytics/devguides/collection/ga4/views), [configuration reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/config), [recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events), and [verification guide](https://developers.google.com/analytics/devguides/collection/ga4/troubleshoot).

## Content and styling

- `index.html`: Japanese page content and semantic markup.
- `src/styles.scss`: design tokens, layouts, and responsive styles.
- `src/main.js`: mobile navigation, link handling, and the inquiry form integration point.
- `src/carousel.js`: shared carousel controls and pagination for both landing pages.
- `templates/parents.html`, `src/parents.scss`, and `src/parents.js`: parent landing page, responsive styles, shop carousel, and release notification form.
- `src/config.js`: destinations to configure before launch.
- `src/partials/`: shared HTML header and footer.
- `templates/`: announcement archive, article, and inquiry form layouts.
- `content/news/`: announcement files; newest dates appear first automatically.
- `content/legal/`: the full privacy policy and terms, transcribed from the supplied documents.
- `public/assets/`: original images and SVGs downloaded from Figma.
- Noto Sans JP and Poppins are bundled locally through Fontsource.

Sponsor buttons lead to `/contact/`; the news archive is at `/news/`, and the privacy policy is at `/privacy/`. `src/config.js` can override these destinations. The parent page is at `/parents/`, with links back to the sponsor page. Its CAMPFIRE button links to https://camp-fire.jp/projects/963630. The commercial disclosure destination shows a preparation notice until configured.

## Adding an announcement

Copy `templates/announcement.html` into `content/news/`, give it a unique filename, then edit the JSON comment at the top and replace the HTML body:

```html
<!-- { "slug": "new-partner", "date": "2026-10-13", "title": "新しいパートナーのお知らせ" } -->
<p>記事の本文をここに入れます。</p>
<h2>小見出し</h2>
<p>段落、リンク、リスト、画像などの通常のHTMLを使えます。</p>
```

The slug sets the URL (`/news/new-partner/`). Use a unique lowercase slug with hyphens and a valid `YYYY-MM-DD` date. Local images go in `public/assets/` and can be referenced as `/assets/your-image.jpg`. Article HTML is trusted site content, so only add markup you intend to publish.

The archive and the latest three homepage announcements update automatically. During `npm run dev`, saving, adding, or removing an article reloads the preview. `npm run build` outputs complete static HTML for every page, including article content and shared navigation. No client-side router or CMS is required.

`parents/`, `news/`, `contact/`, `privacy/`, and `terms/` are generated, ignored directories and are recreated by Vite. Make edits in `content/`, `templates/`, or `src/partials/`. Two editable starter announcements are included; review their body copy before publishing.

## Privacy policy and terms

- `/privacy/`: the complete privacy policy, with the site's shared navigation and footer. The footer and inquiry-form consent link both point here. The form opens the policy in a new tab so entered form values remain in place.
- `/terms/`: the complete terms in a standalone layout for the mobile app's WebView. It uses the site's logo, colors, and locally bundled font without sponsor navigation, promotional buttons, or a website menu link. No query parameters or login are required. Vite dev and preview redirect `/terms` and `/privacy` to their canonical trailing-slash URLs. The static host should serve directory indexes or provide equivalent redirects.

Both pages are complete static HTML and can be read with JavaScript disabled. Their wording, article numbers, tables, and October 1, 2026 revision history were preserved from the two `.docx.odt` files supplied in the project root. The editable HTML is `content/legal/privacy.html` and `content/legal/terms.html`; changing the original office files does not reimport their text. Legal content changes reload automatically during `npm run dev`.

The production build includes `dist/privacy/index.html` and `dist/terms/index.html`. Deploy the full `dist/` directory so the styles and fonts are available at both URLs.

## Parent page and release notifications

`/parents/` follows the Draft v3 desktop and mobile parent frames, with parent-specific navigation and the existing mobile menu behavior. The four shops can be browsed using the arrow buttons, dots, keyboard arrows, or horizontal touch scrolling. The navigation retains the animated underline. Release notification buttons link to `#signup`; sponsor buttons link to `/`.

The CAMPFIRE project URL is configured in `src/config.js` and the static button in `templates/parents.html`, so it also works without JavaScript. Campaign copy and dates are editable in `templates/parents.html`.

The release notification form validates email and privacy consent; child age is optional. It submits to `POST https://kids-up.app/api/rashimba/release_notifications` with `email`, `child_age`, and `privacy_consent`. The shared handler in `src/inquiry-form.js` shows success/error feedback, preserves values on failure, and prevents duplicate submissions during a request. The privacy policy opens in a new tab.

Original assets and source frames are recorded in `docs/parents-design-assets.json`. A few gameplay and campaign nodes contain multiple image fills: available source exports are used where Figma’s Starter-plan tool limit prevented retrieving the visible fill. Layout, image slots, and responsive behavior follow the supplied frames.

## Inquiry backend

The form at `/contact/` follows the Figma layout. Company, email, name, and privacy consent are required; phone and notes are optional. It submits to `POST https://kids-up.app/api/rashimba/sponsor_inquiries`. Browser and server validation apply.

Both forms send flat JSON without cookies, with a UUID `submission_key`, a honeypot, and an optional reCAPTCHA v3 token. Retrying unchanged values after a network failure reuses the UUID. The Rails API persists the inquiry and queues separate confirmation/internal emails from `notifications@rashimba.com`; the internal recipient is `p-jayson@kids-up.jp`. Only Rails admins can read or manage saved inquiries.

reCAPTCHA is optional for now, including in production. Leave `VITE_RASHIMBA_RECAPTCHA_SITE_KEY` and `RASHIMBA_RECAPTCHA_SECRET_KEY` unset to submit without CAPTCHA; validation, rate limits, duplicate prevention, and the honeypot still apply. To enable CAPTCHA later, set the frontend public v3 site key and its matching secret on Rails. The secret belongs only on Rails. `VITE_RASHIMBA_API_BASE_URL` defaults to `https://kids-up.app`; set it in `.env.local` to override for development. The Rails origin allowlist must include the actual frontend origin. Once the Rails secret is configured, valid CAPTCHA tokens are required and verification failures prevent submission. SES verification/DNS and Rails deployment details are in `../seasonal/docs/rashimba-inquiries.md`. The privacy policy destination defaults to `/privacy/` in `src/config.js`.

Run `node --test tests/inquiry-form.test.js` for form submission/retry checks.

## Figma source

File: [らしんば — Draft v3](https://www.figma.com/design/QWpPPgqMp6KFqeTyOjC3yP/?node-id=270-9793)

- Desktop: `270:9793`, 1440 × 11666.
- Mobile: `270:10269`, 390 × 13082.
- Parent desktop: `287:11565`, 1440 × 8792.
- Parent mobile: `287:11951`, 390 × 10142.
- Mobile open menu (`SP_menu`): `287:12518`, 390 × 844.
- Announcement archive: `152:2590`.
- Announcement article: `152:3255`.
- Sponsor inquiry form: `152:3401`.
- The originally linked `171:5330` is the old exploration section; it was excluded.

The desktop and mobile drafts contain small copy differences, including the 「日本初」 footnote. Those footnotes follow their respective frames. The mobile carousel keeps its controls below the complete card text to prevent the overlap present in the draft. Both carousels use one real pagination button per image (three sponsor images, four parent images); buttons are generated from the cards so adding an image also adds its dot. The selected card is centered, with the active dot synchronized across buttons, keyboard navigation, manual scrolling, and responsive resizing. Decorative dot images are no longer used.

Local Chrome checks cover 320, 390, 768, 1024, and 1440 pixel viewports, image loading, page overflow, mobile menu navigation and keyboard focus, navbar underline behavior, archive/article links, and inquiry form validation. Inquiry integration checks cover API requests and retry behavior with mocked network responses; they send no live email.

Parent-page Chrome checks cover the same five viewport widths, original asset loading, responsive overflow, both directions of sponsor/parent navigation, mobile menu focus and anchor navigation, carousel arrows/dots/keyboard/touch scrolling, the unconfigured CAMPFIRE notice, and release notification validation with no POST.

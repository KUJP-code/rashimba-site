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

SEO metadata, canonical URLs, structured data, `sitemap.xml`, and `robots.txt` are generated at build time for `https://rashimba.com`. Set `SITE_URL` to change the official HTTPS origin. Cloudflare builds from `deploy` allow indexing on the custom domain; other branches and all `pages.dev` copies receive `noindex`. Optimized WebP copies are served where available, while the original Figma assets are retained. Run `node --test tests/*.test.*` for the SEO and form checks.

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

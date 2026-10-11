# らしんば — For Sponsor

Responsive static implementation of the **Draft v3** sponsor page, built with Vite, plain HTML, SCSS, and a small amount of vanilla JavaScript.

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

## Content and styling

- `index.html`: Japanese page content and semantic markup.
- `src/styles.scss`: design tokens, layouts, and responsive styles.
- `src/main.js`: mobile navigation, carousel, and link handling.
- `src/config.js`: destinations to configure before launch.
- `public/assets/`: original images and SVGs downloaded from Figma.
- Noto Sans JP and Poppins are bundled locally through Fontsource.

Set `siteLinks.sponsorEnquiryUrl` in `src/config.js` to the enquiry form, PDF, or `mailto:` address when ready. Until configured, the buttons lead to the contact section and show an honest preparation notice. No form submission is simulated. The parent page, news archive, privacy policy, and legal destinations have separate configuration fields and a preparation notice until configured.

## Figma source

File: [らしんば — Draft v3](https://www.figma.com/design/QWpPPgqMp6KFqeTyOjC3yP/?node-id=270-9793)

- Desktop: `270:9793`, 1440 × 11666.
- Mobile: `270:10269`, 390 × 13082.
- The originally linked `171:5330` is the old exploration section; it was excluded.

The desktop and mobile drafts contain small copy differences, including the 「日本初」 footnote. Those footnotes follow their respective frames. The mobile carousel keeps its controls below the complete card text to prevent the overlap present in the draft.

Local Chrome checks cover 320, 390, 768, 1024, and 1440 pixel viewports, image loading, page overflow, mobile menu navigation, carousel controls, and the unconfigured enquiry state.

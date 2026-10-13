import { writeFileSync } from 'node:fs';

// Cloudflare provides the branch name for both production and preview builds.
// Only the deploy branch may be indexed on a custom domain.
const branch = process.env.CF_PAGES_BRANCH;
const rules = branch && branch !== 'deploy'
  ? '/*\n  X-Robots-Tag: noindex, nofollow\n'
  : 'https://:project.pages.dev/*\n  X-Robots-Tag: noindex\n\nhttps://:version.:project.pages.dev/*\n  X-Robots-Tag: noindex\n';

writeFileSync(new URL('../dist/_headers', import.meta.url), rules);
console.log(branch && branch !== 'deploy'
  ? `Cloudflare: indexing disabled for ${branch}.`
  : 'Cloudflare: custom domains may be indexed; pages.dev copies are noindex.');

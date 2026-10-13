# Cloudflare Pages deployment

Repository: https://github.com/KUJP-code/rashimba-site

The latest site lives on `staging`. The `deploy` branch starts from the previous
`main` commit; merge `staging` into `deploy` when the new site is ready for release.
Keep further site changes on `staging` or feature branches merged into it.

## Projects when DNS is managed elsewhere

Create two Git-integrated Pages projects connected to the same repository:

| Setting | Staging project | Live project |
| --- | --- | --- |
| Suggested project name | `rashimba-staging` | `rashimba-site` |
| Production branch | `staging` | `deploy` |
| Build command | `npm run build` | `npm run build` |
| Build output directory | `dist` | `dist` |
| Root directory | Repository root | Repository root |
| Automatic production deployments | Enabled | Enabled |
| Preview deployments | Disabled initially | Disabled initially |

The project names above are suggestions; Cloudflare assigns the actual
`*.pages.dev` addresses. The committed `.node-version` selects Node.js 22.
Until `staging` is promoted, the live project contains the older site from `main`.
You can create and review the staging project first and connect the live project
after promotion. No Cloudflare API token is needed in this repository when
Cloudflare's GitHub integration performs the deployments.

Cloudflare's custom domain mapping to a *preview branch* requires proxied
Cloudflare DNS. With external DNS, use each project's production branch as above
so its custom domain reliably serves the intended branch.

## DNS handoff

1. Deploy the appropriate project successfully.
2. Add the desired hostname under that project's **Custom domains** in Cloudflare.
3. Send the DNS manager the CNAME record Cloudflare requests.

Illustrative records only; replace the domain and targets with the actual values:

| Type | Host | Target |
| --- | --- | --- |
| CNAME | `staging.example.com` | `<staging-project>.pages.dev` |
| CNAME | `www.example.com` | `<live-project>.pages.dev` |

The target is a hostname, without `https://` or a path. Register the custom domain
in Pages before adding its CNAME. Cloudflare handles certificate issuance once
validation succeeds; complete any additional validation records it requests.

External DNS works for subdomains such as `www.example.com` and
`staging.example.com`. Cloudflare's documented Pages setup for the bare domain
`example.com` requires moving the domain's authoritative nameservers to
Cloudflare. If DNS must remain external, discuss using `www` for the site and an
HTTPS redirect from the bare domain with the DNS/hosting manager.

## Staging indexing and access

`npm run build` generates `dist/_headers` using `CF_PAGES_BRANCH`, which
Cloudflare injects automatically:

- Any named branch other than `deploy`: `X-Robots-Tag: noindex, nofollow` on all
  static responses, including custom domains and `pages.dev` URLs.
- `deploy`, or a local build without that variable: only the `pages.dev` copies
  receive `noindex`; the custom live domain is indexable.

These rules are generated for each build, so merging staging code into `deploy`
does not carry a global staging `noindex` rule into production. Do not override
`CF_PAGES_BRANCH` in the Cloudflare dashboard. No `robots.txt` crawl block is
added, so search engines can read the `noindex` header.

`noindex` prevents indexing by supporting search engines; it does not make the
site private. Authentication must be configured separately if staging content
must be inaccessible to outsiders. Cloudflare's built-in preview Access toggle
does not protect a project's production `pages.dev` hostname or custom domain.
With external DNS, verify that any chosen Access/authentication setup supports
and covers both the staging custom hostname and its direct `pages.dev` entry
points before treating staging as private.

After setup, verify actual Cloudflare responses:

```sh
curl -I https://staging.example.com/parents/
curl -I https://www.example.com/parents/
```

Staging should include `X-Robots-Tag: noindex, nofollow`; the live custom domain
should not include `noindex`. Vite's local preview does not interpret `_headers`.
Forms remain static placeholders until their backends are connected.

## Promotion

Open a GitHub pull request with base `deploy` and compare `staging`, review the
staging site, then merge when ready. Further pushes to each project's configured
production branch trigger its builds automatically. Branch protection and
required checks can be configured in GitHub before regular releases.

References:

- [Custom domains and external DNS](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Custom branch aliases and DNS requirements](https://developers.cloudflare.com/pages/how-to/custom-branch-aliases/)
- [Build environment variables](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Static response headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Preview deployment indexing and Access coverage](https://developers.cloudflare.com/pages/configuration/preview-deployments/)

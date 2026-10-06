# The Bukit Besi Tools

A lightweight directory of free developer and creator tools, hosted at
https://the.thebukitbesi.com/ on GitHub Pages.

## Edit and build

Edit `tools-src/tools.json` for tool records, `tools-src/site.json` for site
metadata and FAQs, and `tools-src/template.html` for the page layout.
Only records with `live: true` appear in the directory, structured data,
and LLM summary. Keep unpublished records until their pages are ready.
Each published tool has a distinct SVG icon in `tools-src/icons.mjs`; the
build checks that every live record names an existing icon.

```sh
node tools-src/build.mjs
node tools-src/validate.mjs
```

The build generates `tool.html`, `robots.txt`, `sitemap.xml`, and `llms.txt`.
Update `dateModified` when the published content materially changes.
The sitemap lists the directory's canonical URL; linked tools on the main blog
belong in that host's sitemap.

## Preview and deploy

```sh
node tools-src/preview.mjs
```

Open http://127.0.0.1:8765/. The preview serves the directory at the root so
service-worker caching matches production. The deployment workflow builds and validates
the files, stages `tool.html` as `index.html`, and publishes the crawl files,
404 page, PWA manifest, root service worker, offline fallback, and local image
assets. A push to `main` triggers deployment.

The `CNAME` and `site.json` origin must agree.

## PWA and offline access

The app installs as The Bukit Besi Tools. It saves the directory and local
assets after a successful online visit. Tool pages on Blogger still require
internet. Same-tab links preserve normal Back-button navigation.

Edit the worker source in `assets/PWA/sw.js`, and rebuild to generate `/sw.js`.
The build derives its cache revision from the content and precached assets.
Do not edit the generated worker by hand. See [PWA details](docs/pwa.md).

## Verification

See [the SEO and performance audit](docs/seo-audit.md) for measured results and
remaining production checks. Lighthouse scores are lab checks; actual visitor
Core Web Vitals and search rankings depend on the deployed site.
The [Blogger discovery report](docs/tool-discovery.md) documents all 48 current
tool pages and distinguishes verified live links from observed search results.

## License

MIT

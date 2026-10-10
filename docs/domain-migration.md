# Domain migration: the.thebukitbesi.com → tool.thebukitbesi.com

The directory was first published on `the.thebukitbesi.com` by mistake. The
canonical host is now **`https://tool.thebukitbesi.com/`**. Every generated
file (canonical tag, Open Graph, JSON-LD `@id`s, sitemap, robots.txt,
llms.txt, manifest, IndexNow key location) reads the host from
`tools-src/site.json`, and the build fails if `CNAME` disagrees.

## 1. Point DNS at GitHub Pages

At the DNS provider for `thebukitbesi.com`, add:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `tool` | `bukitbesi.github.io` |

Keep the existing `the` record until step 3 is live.

## 2. Set the custom domain in GitHub

This repo deploys with GitHub Actions, so GitHub **ignores the `CNAME` file**
for routing. Set it manually:

1. Repo **Settings → Pages → Custom domain** → `tool.thebukitbesi.com` → Save.
2. Wait for the DNS check, then tick **Enforce HTTPS**.
3. Optional but recommended: verify `thebukitbesi.com` under
   **GitHub profile Settings → Pages → Verified domains** to block subdomain
   takeover of unused hosts.

## 3. Redirect the old host

GitHub Pages serves one custom domain per repository, so the old host needs
its own redirect. Pick one (both are free):

- **Cloudflare (best, real HTTP 301)** — only if `thebukitbesi.com` DNS is on
  Cloudflare. Rules → Redirect Rules → *Dynamic*: when hostname equals
  `the.thebukitbesi.com`, redirect to
  `concat("https://tool.thebukitbesi.com", http.request.uri.path)` with status
  301 and *Preserve query string*. The `the` DNS record must be proxied.
- **Second GitHub Pages repo** — create a public repo (for example
  `bukitbesi/the-redirect`), copy everything in `migration/old-host/` into its
  root, enable Pages from the `main` branch, and set its custom domain to
  `the.thebukitbesi.com`. The page uses `meta refresh` 0 plus a script that
  keeps the path and fragment; Google treats an instant meta refresh as a
  permanent redirect. Its `sw.js` replaces the old directory service worker,
  clears its caches and unregisters, so installed users stop seeing the old
  copy.

PWA installs are tied to the origin. Anyone who installed the app from the old
host must install it again from `tool.thebukitbesi.com`.

## 4. Search Console and Bing

1. Add a **Domain property** for `thebukitbesi.com` (DNS TXT verification)
   so both subdomains are covered, or a URL-prefix property for
   `https://tool.thebukitbesi.com/`.
2. Submit `https://tool.thebukitbesi.com/sitemap.xml` and request indexing
   of the home page in URL Inspection.
3. In Bing Webmaster Tools, import from Search Console. Each deployment also
   pings IndexNow (see `.github/workflows/deploy.yml`), which reaches Bing and
   the Bing-backed answers in ChatGPT search and Copilot.
4. Google's *Change of Address* tool works only for root domains, not
   subdomains; the redirect in step 3 does that job here.

## 5. Update links you control

- Blogger theme / navigation and any posts linking to `the.thebukitbesi.com`.
- Social profiles and bio links.
- The GitHub repo **About → Website** field.

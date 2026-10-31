# Cloudflare

`thebukitbesi.com` uses Cloudflare DNS (Free plan). Only `tool.thebukitbesi.com` is proxied (orange cloud);
`www` (Blogger) and the root domain stay DNS-only (grey cloud) so Google keeps serving and renewing the Blogger SSL.

## DNS records that must exist

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `tool` | `bukitbesi.github.io` (GitHub Pages) | Proxied |
| CNAME | `www` | `ghs.googlehosted.com` | DNS only |
| A | `@` | `216.239.32.21`, `216.239.34.21`, `216.239.36.21`, `216.239.38.21` (four records) | DNS only |
| CNAME | Blogger verification name | `gv-….dv.googlehosted.com` | DNS only |

Blogger → Settings → Publishing → "Redirect domain" must be on, so the root domain redirects to `www`.

## Cache purge on deploy

The Cache Rule `tool-cache-all` keeps pages at the edge for a day. `.github/workflows/cloudflare-purge.yml` purges
`tool.thebukitbesi.com` after every Pages deploy, including the scheduled gold/fuel/solat updates.

One-time setup:

1. Cloudflare → My Profile → API Tokens → Create Token → "Create Custom Token".
   Permissions: **Zone → Cache Purge → Purge**. Zone Resources: **Include → Specific zone → thebukitbesi.com**.
   Create and copy the token (it is shown once).
2. Cloudflare → thebukitbesi.com → Overview → right column → copy **Zone ID**.
3. GitHub → this repo → Settings → Secrets and variables → Actions → New repository secret:
   `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ZONE_ID` (the Zone ID).
4. Actions → "Purge Cloudflare cache" → Run workflow, and check that the log says `Cloudflare cache purged.`

Without the secrets the workflow logs a warning and skips the purge; it never fails the deploy.

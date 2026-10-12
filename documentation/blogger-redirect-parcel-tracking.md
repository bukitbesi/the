# Redirect the old Blogger tracking page

The old page `https://www.thebukitbesi.com/p/semak-tracking-semua-kurier-di-malaysia.html`
is replaced by the hosted tracker. Its content is Bahasa Melayu, so it redirects to the
Bahasa Melayu page, which links to the English one with hreflang:

| Old URL | New URL |
| --- | --- |
| `/p/semak-tracking-semua-kurier-di-malaysia.html` | `https://tool.thebukitbesi.com/semak-tracking-parcel/` |

The redirect is part of the generated block for all moved tools: see
[blogger-redirects.md](blogger-redirects.md). Its Blogger URL is set by `"bloggerFrom"` on
`tools-src/pages/semak-tracking-parcel.html`.

## After deployment: click-test courier links

The tracker links to each courier's own site. Courier sites change URLs without notice, so after
each deploy (and every few months) open `/parcel-tracking-malaysia/`, enter a real tracking number
for each courier you have, and check the page opens. If a link breaks, update `home` or `track` for
that courier in `assets/js/tracking-core.js` and the `verified` date in `FACTS`, then rebuild.

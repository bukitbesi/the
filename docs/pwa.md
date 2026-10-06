# PWA and offline access

Updated 7 October 2026 for `https://the.thebukitbesi.com/`. Saved locally;
not pushed or deployed by this task.

## What changed

The old manifest had invalid JSON comments, missing `/pwa/` icon files,
unused blog/search shortcuts and a POST share target with no server handler.
The old client accessed `self.registration` in a window context, attempted
to queue POST requests in Cache Storage, referenced non-existent comment and
push APIs, and could reload twice while applying an update. The old root
worker was not included in deployment; `src/service-worker.js` was empty.

The new build generates a valid `/manifest.webmanifest` and `/sw.js`. The
manifest has a stable app ID, root scope, standalone display, actual 192- and
512-pixel PNG icons, a separate padded maskable icon, and directory shortcuts.
The old `src/manifest.json` is regenerated as a valid compatibility copy.
Legacy worker entry files import the generated root worker; the directory
registers only `/sw.js` with root scope.

The install button appears in the footer for supported secure browser
contexts. It uses the native installation prompt when available and provides
browser-menu instructions otherwise. It does not request notification
permissions or subscribe visitors to push services.

## Cache behavior

- Installation precaches the public directory, offline fallback, PWA client,
  manifest, app icons and the page's local logo/favicon assets.
- Directory navigation is network first, with a 3.5-second timeout and saved
  content as the offline fallback. A late successful response can refresh the
  stored directory. Directory tracking-query variants use the same public
  directory cache entry; arbitrary pages and API queries are not stored.
- Only the listed same-origin static assets use cache first. The worker leaves
  cross-origin resources, API calls, POST requests, analytics and ads alone.
- Uncached navigation while offline gets an explanatory page with HTTP 503
  and `noindex`. A real online 404 remains a 404 and cannot poison the cache.
- Cache revisions are derived from the page, worker template, manifest and
  precached file contents. Updates wait for the visitor to select Update or
  close all old app tabs. Applying an update reloads the consenting tab once.
- Activation removes only older `bukit-tools-` caches. Unrelated caches are
  retained. There is no automatic clearing of arbitrary origin storage.

The browser may evict cached files, and a first visit without internet cannot
install the app. HTTPS is required in production; localhost works for testing.
See [MDN's service-worker lifecycle guidance](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Offline scope and navigation

Visitors can browse all 48 saved tool descriptions, SVG icons and category
filters. The actual tools are still on `www.thebukitbesi.com`; this app does
not control navigation documents on that other origin and does not cache them.
Those tools require internet until their implementations are migrated here.

Tool links use the same tab. When the browser reports offline, a normal tool
click shows an explanation and an Open tool anyway link rather than losing
the saved directory immediately. Connection status is a hint, so the visitor
can retry the original destination; see
[MDN's onLine limitations](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine).
Modified clicks retain their usual browser behavior.

Hosting actual tools at individual subdomain URLs would keep tool navigation
inside the site and allow appropriate local tools to work offline. Tools
that depend on remote AI, exchange rates, tracking services or speed-test
servers would still need internet for those operations. No tool migration,
iframe wrapping, forced new windows, auto-refresh or synthetic page views
were added here.

## Validation and deployment

```sh
node tools-src/build.mjs
node tools-src/validate.mjs
node tools-src/preview.mjs
```

Preview at `http://127.0.0.1:8765/`, visit once online, wait for activation,
then switch DevTools to Offline and reload. Opening HTML directly through
`file://` cannot test service workers. The deployment workflow includes the
root worker, manifest, fallback, client script and app icon folder.

`tools-src/test-pwa.cjs` runs browser regression checks in a disposable local
HTTP fixture and Chrome profile. It requires `puppeteer-core` (or its path in
`PUPPETEER_MODULE`) and `CHROME_PATH` for the browser executable. It tests Chrome
installability, complete precache, offline reload and filters, offline link
messaging, HTTP 503 fallback, online 404 handling, POST bypass, waiting updates,
single reload and selective cache cleanup. It does not install an app on the
user's operating system or modify the production worker.

After deployment, check the canonical site on real Android and iOS devices;
installation UI varies by browser. Verify `/sw.js` has a JavaScript content
type and `/manifest.webmanifest` is reachable. Cached-content availability
and real-user Core Web Vitals still depend on production and the device.

# Live gold price worker (Cloudflare, free plan)

The gold price pages (`/harga-emas-hari-ini/`, `/gold-price-malaysia/`) show the daily price baked in by the
`Daily gold price` GitHub Action. With this worker they also refresh the price every minute.

The worker (`tools-src/gold-worker/worker.js`) calls three public sources and caches the answer for 5 minutes:

| Source | Data |
| --- | --- |
| `api.gold-api.com/price/XAU` | Spot gold, USD per troy ounce |
| `api.bnm.gov.my/public/kijang-emas` | Bank Negara Kijang Emas buying and selling prices |
| `api.bnm.gov.my/public/exchange-rate/USD` (backup: Frankfurter, ECB rates) | USD/MYR |

## Deploy (about 5 minutes)

1. Log in to the Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it `tbb-gold` → **Deploy**.
3. **Edit code**, delete the sample, paste the whole of `tools-src/gold-worker/worker.js`, then **Deploy**.
4. Open `https://tbb-gold.<your-subdomain>.workers.dev` in the browser. You should see JSON with `spot`, `kijang`
   and `fx` filled in (any of them can be `null` if that source is briefly down).
5. Put that URL in `tools-src/site.json` as `"goldApi": "https://tbb-gold.<your-subdomain>.workers.dev"`, run
   `node tools-src/build.mjs`, and commit `site.json` with `docs/` (or ask Claude to do it).

The free plan allows 100,000 requests a day; each visitor's page asks once a minute only while the tab is visible.

## If a source stops working

The page keeps the last good price and labels its source and time. If `gold-api.com` changes or closes, replace the
`spot` URL in the worker (and `parseSpot` in `assets/js/gold-core.js`) with another free spot-gold API.

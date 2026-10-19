# The Bukit Besi Tools — 106 Free Online Tools for Developers & Creators

[![Deploy](https://github.com/bukitbesi/the/actions/workflows/deploy.yml/badge.svg)](https://github.com/bukitbesi/the/actions/workflows/deploy.yml)
[![Live site](https://img.shields.io/badge/live-tool.thebukitbesi.com-6c5ce7)](https://tool.thebukitbesi.com/)
[![License: All rights reserved](https://img.shields.io/badge/license-all%20rights%20reserved-d63031)](LICENSE)

**[tool.thebukitbesi.com](https://tool.thebukitbesi.com/)** is a free, installable
directory of 106 browser-based tools from [The Bukit Besi](https://www.thebukitbesi.com/):
code minifiers, SEO and schema generators, writing utilities, image editors,
AI prompt tools and Malaysian calculators (zakat, faraid, BMI and more).
No signup, no tracking scripts, works offline after one visit.

| Category | Examples |
| --- | --- |
| Developer Tools | JavaScript minifier & obfuscator, CSS minifier, HTML beautifier, JSON formatter & validator |
| SEO Tools | JSON-LD and video schema generators, robots.txt generator, SEO meta analyzer, FAQ formatter |
| Content Tools | Word counter, text case converter, find & replace, text to HTML, online notepad |
| Design Tools | WebP and image format converters, color contrast checker, photo editor, WhatsApp stickers |
| AI Tools | AI art and video prompt generators, image to prompt, paraphraser, cartoonizer |
| Utilities | WhatsApp link creator, PDF & Word converter, currency converter, speed tests, courier tracking |
| Calculators | Kalkulator zakat, faraid, saiz kasut, kalori, BMI, pregnancy dates |

The full, always-current list is generated into [`llms.txt`](llms.txt).

## Performance and search

- **Core Web Vitals:** single static HTML file, inline critical CSS, system
  fonts, inline SVG icons, no render-blocking third-party code. Local
  Lighthouse mobile with all three ad units enabled: 99–100 performance,
  100 accessibility/best practices/SEO, TBT 0 ms, CLS 0
  ([audit](documentation/seo-audit.md)). GitHub Pages CDN keeps TTFB low.
- **SEO:** canonical URL, Open Graph + 1200×630 social card, sitemap,
  robots.txt, one `@graph` of Organization, WebSite, CollectionPage,
  ItemList (with per-tool descriptions) and FAQPage JSON-LD that is checked
  against the visible content on every build.
- **AEO / LLM visibility:** answer-first FAQ, an `llms.txt` directory
  ([llmstxt.org](https://llmstxt.org/)), open crawling for AI agents and an
  IndexNow ping on every deployment (Bing, ChatGPT search, Copilot).
- **PWA:** web app manifest with maskable icons and install screenshots, a
  versioned service worker (network-first directory, offline fallback,
  consent-based updates). See [PWA details](documentation/pwa.md).

- **Theme:** light by default (matches standard AdSense creatives), with a
  dark-mode toggle. The choice is stored per browser and applied before
  first paint, so there is no flash or layout shift. Both themes pass
  WCAG AA contrast (axe-core).

## Google Tag Manager and GA4

`gtm` in `tools-src/site.json` holds the container ID (`GTM-M3WSN44C`); empty removes it from every page. The layout
sets Consent Mode v2 defaults (denied in the EEA, UK and Switzerland, granted elsewhere) and loads `gtm.js` on the
visitor's first scroll, tap, key or mouse move, or 3.5 s after the page is idle, so it never costs Lighthouse points.
`validate.mjs` fails the build if GTM ever becomes a blocking `<script src>`.

- **GA4:** in GTM add a **Google tag** with the `G-` measurement ID, trigger **Initialization - All Pages**. Do not paste
  a gtag.js snippet into the site as well (double counting).
- **Events already in the dataLayer:** `solat_zone` (`solat_zone`, `solat_method`: `select` or `gps`) and
  `solat_print` (`solat_zone`) from the prayer time pages. In GTM: a Custom Event trigger per event name and a GA4
  Event tag with the same parameters (register them as custom dimensions in GA4).
- `404.html` and `offline.html` are static and carry no GTM.

## AdSense

Fill in `adsense` in `tools-src/site.json`:

```json
"adsense": {
  "client": "ca-pub-0000000000000000",
  "slots": { "top": "1234567890", "middle": "1234567890", "bottom": "1234567890" }
}
```

Create three **Display ads → Responsive** units in AdSense and paste only their
`data-ad-slot` **numbers** (e.g. `2106466698`), not the whole ad code; the build
writes the ad markup and rejects anything that is not digits. The build then adds the units (after the hero, between
Categories and Why, and between FAQ and the closing call to action), each
labelled "Advertisement" with space reserved to prevent layout shift, and
writes `ads.txt`. The AdSense library loads only after the visitor's first
scroll, tap, key press or mouse move; the ad code itself is unmodified. With
`client` empty, no ad code is published.

## Hosted calculators

| Page | Language | Targets |
| --- | --- | --- |
| [/salary-calculator-malaysia/](https://tool.thebukitbesi.com/salary-calculator-malaysia/) | English | salary calculator malaysia, PCB / EPF / SOCSO calculator |
| [/kalkulator-gaji/](https://tool.thebukitbesi.com/kalkulator-gaji/) | Bahasa Melayu | kalkulator gaji bersih, kalkulator KWSP / PCB |
| [/income-tax-calculator-malaysia/](https://tool.thebukitbesi.com/income-tax-calculator-malaysia/) | English | income tax calculator malaysia, YA2026 tax relief, Budget 2027 tax |
| [/kalkulator-cukai-pendapatan/](https://tool.thebukitbesi.com/kalkulator-cukai-pendapatan/) | Bahasa Melayu | kalkulator cukai pendapatan, pelepasan cukai TT2026 |
| [/epf-calculator/](https://tool.thebukitbesi.com/epf-calculator/) | English | epf calculator, epf dividend 2025, epf retirement savings |
| [/kalkulator-kwsp/](https://tool.thebukitbesi.com/kalkulator-kwsp/) | Bahasa Melayu | kalkulator kwsp, dividen kwsp, simpanan persaraan |
| [/home-loan-calculator-malaysia/](https://tool.thebukitbesi.com/home-loan-calculator-malaysia/) | English | home loan calculator malaysia, loan calculator, stamp duty, DSR |
| [/kalkulator-pinjaman-perumahan/](https://tool.thebukitbesi.com/kalkulator-pinjaman-perumahan/) | Bahasa Melayu | kalkulator pinjaman perumahan, kalkulator loan rumah, duti setem |
| [/car-loan-calculator-malaysia/](https://tool.thebukitbesi.com/car-loan-calculator-malaysia/) | English | car loan calculator malaysia, flat rate to EIR, Rule of 78, road tax, car insurance |
| [/kalkulator-loan-kereta/](https://tool.thebukitbesi.com/kalkulator-loan-kereta/) | Bahasa Melayu | kalkulator loan kereta, pinjaman kereta, EIR, cukai jalan, insurans kereta |
| [/asb-dividend-calculator/](https://tool.thebukitbesi.com/asb-dividend-calculator/) + [/kalkulator-dividen-asb/](https://tool.thebukitbesi.com/kalkulator-dividen-asb/) | English + BM | asb dividend calculator, asb financing calculator; kalkulator dividen asb, loan asb |
| [/prorated-salary-calculator-malaysia/](https://tool.thebukitbesi.com/prorated-salary-calculator-malaysia/) + [/kalkulator-gaji-prorata/](https://tool.thebukitbesi.com/kalkulator-gaji-prorata/) | English + BM | prorated salary calculator malaysia, unpaid leave deduction; kalkulator gaji prorata |
| [/overtime-calculator-malaysia/](https://tool.thebukitbesi.com/overtime-calculator-malaysia/) + [/kalkulator-ot/](https://tool.thebukitbesi.com/kalkulator-ot/) | English + BM | overtime calculator malaysia, public holiday pay; kalkulator OT akta kerja, kira gaji OT |
| [/kalkulator-minyak/](https://tool.thebukitbesi.com/kalkulator-minyak/) + [/fuel-cost-calculator-malaysia/](https://tool.thebukitbesi.com/fuel-cost-calculator-malaysia/) | BM + English | kalkulator minyak, harga minyak minggu ini, kos minyak perjalanan; fuel cost calculator malaysia, petrol price |
| [/kalkulator-ncd/](https://tool.thebukitbesi.com/kalkulator-ncd/) + [/ncd-calculator-malaysia/](https://tool.thebukitbesi.com/ncd-calculator-malaysia/) | BM + English | kalkulator ncd, ncd insurans kereta, patut claim insurans; ncd calculator malaysia |
| [/kalkulator-iddah/](https://tool.thebukitbesi.com/kalkulator-iddah/) + [/iddah-calculator/](https://tool.thebukitbesi.com/iddah-calculator/) | BM + English | kalkulator iddah, tempoh iddah cerai, iddah kematian suami, ihdad; iddah calculator |
| [/tukar-tarikh-hijrah/](https://tool.thebukitbesi.com/tukar-tarikh-hijrah/) + [/hijri-date-converter/](https://tool.thebukitbesi.com/hijri-date-converter/) | BM + English | tukar tarikh hijrah ke masihi, tarikh hijrah hari ini, kalendar hijrah 2027; hijri date converter malaysia |
| [/kalkulator-bil-elektrik-tnb/](https://tool.thebukitbesi.com/kalkulator-bil-elektrik-tnb/) + [/tnb-bill-calculator/](https://tool.thebukitbesi.com/tnb-bill-calculator/) | BM + English | kalkulator bil elektrik tnb, kira bil tnb, tarif tnb 2026; tnb bill calculator |
| [/kalkulator-ptptn/](https://tool.thebukitbesi.com/kalkulator-ptptn/) + [/ptptn-repayment-calculator/](https://tool.thebukitbesi.com/ptptn-repayment-calculator/) | BM + English | kalkulator ptptn, bayaran balik ptptn, ujrah; ptptn repayment calculator |
| [/kalkulator-fidyah/](https://tool.thebukitbesi.com/kalkulator-fidyah/) + [/fidyah-calculator/](https://tool.thebukitbesi.com/fidyah-calculator/) | BM + English | kalkulator fidyah, kadar fidyah 2026 mengikut negeri; fidyah calculator malaysia |
| [/kalkulator-gabung-hutang/](https://tool.thebukitbesi.com/kalkulator-gabung-hutang/) + [/debt-consolidation-calculator-malaysia/](https://tool.thebukitbesi.com/debt-consolidation-calculator-malaysia/) | BM + English | gabung hutang kad kredit, penyatuan hutang; debt consolidation calculator malaysia |
| [/kalkulator-refinance-rumah/](https://tool.thebukitbesi.com/kalkulator-refinance-rumah/) + [/refinance-calculator-malaysia/](https://tool.thebukitbesi.com/refinance-calculator-malaysia/) | BM + English | kalkulator refinance rumah, kos refinance; refinance calculator malaysia |
| [/kalkulator-sewa-atau-beli-rumah/](https://tool.thebukitbesi.com/kalkulator-sewa-atau-beli-rumah/) + [/rent-vs-buy-calculator-malaysia/](https://tool.thebukitbesi.com/rent-vs-buy-calculator-malaysia/) | BM + English | sewa atau beli rumah; rent vs buy calculator malaysia |
| [/kalkulator-fixed-deposit/](https://tool.thebukitbesi.com/kalkulator-fixed-deposit/) + [/fixed-deposit-calculator-malaysia/](https://tool.thebukitbesi.com/fixed-deposit-calculator-malaysia/) | BM + English | kalkulator fixed deposit, faedah fd; fixed deposit calculator malaysia |
| [/kalkulator-kos-pekerja/](https://tool.thebukitbesi.com/kalkulator-kos-pekerja/) + [/employer-cost-calculator-malaysia/](https://tool.thebukitbesi.com/employer-cost-calculator-malaysia/) | BM + English | kos majikan, caruman kwsp majikan, levi hrd; employer cost calculator malaysia |
| [/kalkulator-margin-untung/](https://tool.thebukitbesi.com/kalkulator-margin-untung/) + [/profit-margin-calculator-malaysia/](https://tool.thebukitbesi.com/profit-margin-calculator-malaysia/) | BM + English | kalkulator margin untung, kira markup; profit margin calculator malaysia |
| [/kalkulator-roas/](https://tool.thebukitbesi.com/kalkulator-roas/) + [/roas-calculator/](https://tool.thebukitbesi.com/roas-calculator/) | BM + English | kalkulator roas, roas pulang modal; roas calculator |
| [/kalkulator-caj-freelance/](https://tool.thebukitbesi.com/kalkulator-caj-freelance/) + [/freelance-rate-calculator-malaysia/](https://tool.thebukitbesi.com/freelance-rate-calculator-malaysia/) | BM + English | caj freelance sejam; freelance rate calculator malaysia |
| [/kalkulator-hari-bekerja/](https://tool.thebukitbesi.com/kalkulator-hari-bekerja/) + [/working-days-calculator-malaysia/](https://tool.thebukitbesi.com/working-days-calculator-malaysia/) | BM + English | kira hari bekerja, hari bekerja 2027 selangor; working days calculator malaysia |
| [/kalkulator-umur-bersara/](https://tool.thebukitbesi.com/kalkulator-umur-bersara/) + [/retirement-age-calculator-malaysia/](https://tool.thebukitbesi.com/retirement-age-calculator-malaysia/) | BM + English | kalkulator umur bersara, kira pencen; retirement age calculator malaysia |
| [/kalkulator-sspn/](https://tool.thebukitbesi.com/kalkulator-sspn/) + [/sspn-calculator/](https://tool.thebukitbesi.com/sspn-calculator/) | BM + English | kalkulator sspn, dividen sspn 2025, pelepasan cukai sspn; sspn calculator |
| [/kalkulator-bil-air/](https://tool.thebukitbesi.com/kalkulator-bil-air/) + [/water-bill-calculator-malaysia/](https://tool.thebukitbesi.com/water-bill-calculator-malaysia/) | BM + English | kira bil air, tarif air selangor 2025; water bill calculator malaysia |
| [/kalkulator-unit-trust/](https://tool.thebukitbesi.com/kalkulator-unit-trust/) + [/unit-trust-calculator-malaysia/](https://tool.thebukitbesi.com/unit-trust-calculator-malaysia/) | BM + English | kalkulator unit trust, caj jualan; unit trust calculator malaysia |
| [/kalkulator-kos-pendidikan-anak/](https://tool.thebukitbesi.com/kalkulator-kos-pendidikan-anak/) + [/education-cost-calculator-malaysia/](https://tool.thebukitbesi.com/education-cost-calculator-malaysia/) | BM + English | kos pendidikan anak, simpanan universiti; education cost calculator malaysia |
| [/waktu-solat/](https://tool.thebukitbesi.com/waktu-solat/) + [/prayer-times-malaysia/](https://tool.thebukitbesi.com/prayer-times-malaysia/) | BM + English | waktu solat hari ini, waktu solat kl, jadual waktu solat, zon jakim; prayer times malaysia |
| /waktu-solat-<state>/ + /prayer-times-<state>/ (15 states and territories, e.g. [/waktu-solat-selangor/](https://tool.thebukitbesi.com/waktu-solat-selangor/)) | BM + English | waktu solat selangor, waktu solat johor, waktu solat kl; prayer times selangor |
| [/arah-kiblat/](https://tool.thebukitbesi.com/arah-kiblat/) + [/qibla-direction-malaysia/](https://tool.thebukitbesi.com/qibla-direction-malaysia/) | BM + English | arah kiblat, darjah kiblat kuala lumpur; qibla direction malaysia |
| [/kalkulator-simpanan-persaraan/](https://tool.thebukitbesi.com/kalkulator-simpanan-persaraan/) + [/retirement-savings-calculator-malaysia/](https://tool.thebukitbesi.com/retirement-savings-calculator-malaysia/) | BM + English | simpanan persaraan cukup, kwsp rm390k; retirement savings calculator malaysia |
| [/kalkulator-cuti-tahunan/](https://tool.thebukitbesi.com/kalkulator-cuti-tahunan/) + [/annual-leave-calculator-malaysia/](https://tool.thebukitbesi.com/annual-leave-calculator-malaysia/) | BM + English | kira cuti tahunan prorata, akta kerja; annual leave calculator malaysia |
| [/kalkulator-faedah-penamatan/](https://tool.thebukitbesi.com/kalkulator-faedah-penamatan/) + [/termination-benefits-calculator-malaysia/](https://tool.thebukitbesi.com/termination-benefits-calculator-malaysia/) | BM + English | faedah penamatan, pampasan diberhentikan kerja; termination benefits calculator malaysia |
| [/kalkulator-roadtax/](https://tool.thebukitbesi.com/kalkulator-roadtax/) + [/road-tax-calculator-malaysia/](https://tool.thebukitbesi.com/road-tax-calculator-malaysia/) | BM + English | kalkulator roadtax, harga roadtax ikut cc, roadtax ev 2026; road tax calculator malaysia |
| [/kalkulator-sst/](https://tool.thebukitbesi.com/kalkulator-sst/) + [/sst-calculator-malaysia/](https://tool.thebukitbesi.com/sst-calculator-malaysia/) | BM + English | kalkulator sst, kira sst 8%; sst calculator malaysia |
| [/kalkulator-saham-bursa/](https://tool.thebukitbesi.com/kalkulator-saham-bursa/) + [/bursa-share-fee-calculator/](https://tool.thebukitbesi.com/bursa-share-fee-calculator/) | BM + English | kalkulator saham bursa, caj brokeraj; bursa share fee calculator |
| [/kalkulator-duti-setem-sewa/](https://tool.thebukitbesi.com/kalkulator-duti-setem-sewa/) + [/tenancy-stamp-duty-calculator-malaysia/](https://tool.thebukitbesi.com/tenancy-stamp-duty-calculator-malaysia/) | BM + English | duti setem perjanjian sewa; tenancy agreement stamp duty calculator |
| [/kalkulator-sip-perkeso/](https://tool.thebukitbesi.com/kalkulator-sip-perkeso/) + [/eis-calculator-malaysia/](https://tool.thebukitbesi.com/eis-calculator-malaysia/) | BM + English | sip perkeso hilang kerja, elaun mencari pekerjaan; eis calculator malaysia |
| [/kalkulator-mas-kahwin/](https://tool.thebukitbesi.com/kalkulator-mas-kahwin/) + [/mas-kahwin-malaysia/](https://tool.thebukitbesi.com/mas-kahwin-malaysia/) | BM + English | kadar mas kahwin ikut negeri, mas kahwin selangor, kalkulator kos kahwin; mas kahwin malaysia |
| [/kalkulator-tabung-haji/](https://tool.thebukitbesi.com/kalkulator-tabung-haji/) + [/hajj-cost-calculator-malaysia/](https://tool.thebukitbesi.com/hajj-cost-calculator-malaysia/) | BM + English | kos haji 2026, kalkulator tabung haji, simpanan RM15,000; hajj cost malaysia |
| [/kalkulator-str/](https://tool.thebukitbesi.com/kalkulator-str/) + [/str-calculator-malaysia/](https://tool.thebukitbesi.com/str-calculator-malaysia/) | BM + English | kalkulator str 2026, berapa str saya dapat, sara 2026; str calculator |
| [/kalkulator-gaji-sspa/](https://tool.thebukitbesi.com/kalkulator-gaji-sspa/) + [/sspa-salary-calculator/](https://tool.thebukitbesi.com/sspa-salary-calculator/) | BM + English | kalkulator gaji sspa, gaji baharu penjawat awam, pelarasan pencen; sspa salary calculator |
| [/kalkulator-ar-rahnu/](https://tool.thebukitbesi.com/kalkulator-ar-rahnu/) + [/ar-rahnu-calculator-malaysia/](https://tool.thebukitbesi.com/ar-rahnu-calculator-malaysia/) | BM + English | kalkulator ar rahnu, upah simpan, pajak gadai emas; ar-rahnu calculator |
| [/kalkulator-umur/](https://tool.thebukitbesi.com/kalkulator-umur/) + [/age-calculator-malaysia/](https://tool.thebukitbesi.com/age-calculator-malaysia/) | BM + English | kalkulator umur, kira umur, umur hijrah; age calculator malaysia |
| [/kalkulator-tarikh-bersalin/](https://tool.thebukitbesi.com/kalkulator-tarikh-bersalin/) + [/due-date-calculator-malaysia/](https://tool.thebukitbesi.com/due-date-calculator-malaysia/) | BM + English | kalkulator tarikh bersalin, cuti bersalin 98 hari; due date calculator |
| [/kalkulator-solar/](https://tool.thebukitbesi.com/kalkulator-solar/) + [/solar-calculator-malaysia/](https://tool.thebukitbesi.com/solar-calculator-malaysia/) | BM + English | kalkulator solar, solar atap, pulang modal solar; solar calculator malaysia |
| [/kos-lesen-memandu/](https://tool.thebukitbesi.com/kos-lesen-memandu/) + [/driving-licence-cost-malaysia/](https://tool.thebukitbesi.com/driving-licence-cost-malaysia/) | BM + English | kos lesen memandu, renew lesen, yuran jpj; driving licence cost malaysia |
| [/kalkulator-faraid/](https://tool.thebukitbesi.com/kalkulator-faraid/) + [/faraid-calculator/](https://tool.thebukitbesi.com/faraid-calculator/) | BM + English | kalkulator faraid, pembahagian harta pusaka; faraid calculator malaysia |
| [/penukar-mata-wang/](https://tool.thebukitbesi.com/penukar-mata-wang/) + [/currency-converter-malaysia/](https://tool.thebukitbesi.com/currency-converter-malaysia/) | BM + English | penukar mata wang, kadar tukaran BNM; currency converter malaysia |
| [/kalkulator-kalori/](https://tool.thebukitbesi.com/kalkulator-kalori/) + [/calorie-calculator-malaysia/](https://tool.thebukitbesi.com/calorie-calculator-malaysia/) | BM + English | kalkulator kalori, BMR, TDEE; calorie calculator malaysia |
| [/kalkulator-saiz-kasut/](https://tool.thebukitbesi.com/kalkulator-saiz-kasut/) + [/shoe-size-converter/](https://tool.thebukitbesi.com/shoe-size-converter/) | BM + English | saiz kasut UK EU US, panjang kaki cm; shoe size converter |
| [/kalkulator-saman-trafik/](https://tool.thebukitbesi.com/kalkulator-saman-trafik/) + [/traffic-summons-calculator-malaysia/](https://tool.thebukitbesi.com/traffic-summons-calculator-malaysia/) | BM + English | kalkulator saman, kadar kompaun 2026, bayar saman awal; traffic summons calculator |
| [/kalkulator-cukai-taksiran/](https://tool.thebukitbesi.com/kalkulator-cukai-taksiran/) + [/assessment-tax-calculator-malaysia/](https://tool.thebukitbesi.com/assessment-tax-calculator-malaysia/) | BM + English | cukai taksiran, cukai pintu DBKL MBPJ MBPP; assessment tax calculator |
| [/kalkulator-kos-ev/](https://tool.thebukitbesi.com/kalkulator-kos-ev/) + [/ev-vs-petrol-cost-calculator-malaysia/](https://tool.thebukitbesi.com/ev-vs-petrol-cost-calculator-malaysia/) | BM + English | kos cas EV, EV vs petrol; ev charging cost malaysia |
| [/parafrasa-ayat/](https://tool.thebukitbesi.com/parafrasa-ayat/) + [/paraphrasing-tool/](https://tool.thebukitbesi.com/paraphrasing-tool/) | BM + English | parafrasa ayat, semak tatabahasa; paraphrasing tool, grammar checker |
| [/ringkaskan-teks/](https://tool.thebukitbesi.com/ringkaskan-teks/) + [/ai-summarizer/](https://tool.thebukitbesi.com/ai-summarizer/) | BM + English | ringkasan karangan, ringkaskan teks; ai summarizer |
| [/penjana-kapsyen/](https://tool.thebukitbesi.com/penjana-kapsyen/) + [/caption-generator/](https://tool.thebukitbesi.com/caption-generator/) | BM + English | caption ig, kapsyen tiktok, hashtag; caption generator |
| [/penjana-gambar-ai/](https://tool.thebukitbesi.com/penjana-gambar-ai/) + [/ai-image-generator/](https://tool.thebukitbesi.com/ai-image-generator/) | BM + English | penjana gambar ai; ai image generator, text to image |
| [/gambar-ke-kartun/](https://tool.thebukitbesi.com/gambar-ke-kartun/) + [/photo-to-cartoon/](https://tool.thebukitbesi.com/photo-to-cartoon/) | BM + English | tukar gambar jadi kartun; photo to cartoon |
| [/land-size-converter-malaysia/](https://tool.thebukitbesi.com/land-size-converter-malaysia/) + [/kalkulator-ukuran-tanah/](https://tool.thebukitbesi.com/kalkulator-ukuran-tanah/) | English + BM | ekar to square feet, relung to ekar, kaki persegi ke ekar, hectare to acre |
| [/personal-loan-calculator-malaysia/](https://tool.thebukitbesi.com/personal-loan-calculator-malaysia/) + [/kalkulator-pinjaman-peribadi/](https://tool.thebukitbesi.com/kalkulator-pinjaman-peribadi/) | English + BM | personal loan calculator malaysia, flat rate to EIR; kalkulator pinjaman peribadi |
| [/rpgt-calculator-malaysia/](https://tool.thebukitbesi.com/rpgt-calculator-malaysia/) + [/kalkulator-rpgt/](https://tool.thebukitbesi.com/kalkulator-rpgt/) | English + BM | rpgt calculator malaysia 2026; kalkulator rpgt, cukai keuntungan harta tanah |
| [/bmi-calculator-malaysia/](https://tool.thebukitbesi.com/bmi-calculator-malaysia/) + [/kalkulator-bmi/](https://tool.thebukitbesi.com/kalkulator-bmi/) | English + BM | bmi calculator malaysia, kalkulator bmi, berat ideal (moved from the blog) |
| [/kalkulator-zakat-pendapatan/](https://tool.thebukitbesi.com/kalkulator-zakat-pendapatan/) + [/zakat-calculator-malaysia/](https://tool.thebukitbesi.com/zakat-calculator-malaysia/) | BM + English | kalkulator zakat pendapatan, nisab zakat 2026, had kifayah (moved from the blog) |
| [/kalkulator-zakat-emas/](https://tool.thebukitbesi.com/kalkulator-zakat-emas/) + [/gold-zakat-calculator-malaysia/](https://tool.thebukitbesi.com/gold-zakat-calculator-malaysia/) | BM + English | kalkulator zakat emas, uruf emas pakai, zakat simpanan |
| [/harga-emas-hari-ini/](https://tool.thebukitbesi.com/harga-emas-hari-ini/) + [/gold-price-malaysia/](https://tool.thebukitbesi.com/gold-price-malaysia/) | BM + English | harga emas hari ini, harga emas 916, gold price malaysia today, Kijang Emas |
| [/ai-prompt-generator/](https://tool.thebukitbesi.com/ai-prompt-generator/) + [/penjana-prompt-ai/](https://tool.thebukitbesi.com/penjana-prompt-ai/) | English + BM | ai prompt generator, midjourney prompt generator, ai video prompt; penjana prompt ai (moved from the blog, video prompt page merged) |
| [/image-to-prompt/](https://tool.thebukitbesi.com/image-to-prompt/) + [/gambar-ke-prompt/](https://tool.thebukitbesi.com/gambar-ke-prompt/) | English + BM | image to prompt, photo to prompt; gambar ke prompt (moved from the blog) |
| [/cgpa-to-percentage/](https://tool.thebukitbesi.com/cgpa-to-percentage/) | English | cgpa to percentage (+ VTU, AKTU, SPPU, GTU, MAKAUT, Mumbai, CBSE variants) |
| [/cgpa-calculator/](https://tool.thebukitbesi.com/cgpa-calculator/) | English | cgpa calculator, sgpa to cgpa, gpa calculator malaysia |
| [/parcel-tracking-malaysia/](https://tool.thebukitbesi.com/parcel-tracking-malaysia/) | English | parcel tracking malaysia, track parcel malaysia, courier tracking, tracking number format |
| [/semak-tracking-parcel/](https://tool.thebukitbesi.com/semak-tracking-parcel/) | Bahasa Melayu | semak tracking parcel, semak tracking kurier, tracking pos laju / J&T / SPX |
| [/pos-laju-tracking/](https://tool.thebukitbesi.com/pos-laju-tracking/) + [/semak-tracking-pos-laju/](https://tool.thebukitbesi.com/semak-tracking-pos-laju/) | English + BM | pos laju tracking parcel, tracking parcel poslaju; semak tracking pos laju |
| [/jnt-tracking/](https://tool.thebukitbesi.com/jnt-tracking/) + [/semak-tracking-jnt/](https://tool.thebukitbesi.com/semak-tracking-jnt/) | English + BM | tracking parcel jnt / j&t; semak tracking j&t |
| [/ninja-van-tracking/](https://tool.thebukitbesi.com/ninja-van-tracking/) + [/semak-tracking-ninja-van/](https://tool.thebukitbesi.com/semak-tracking-ninja-van/) | English + BM | ninja van tracking parcel; semak tracking ninja van |
| [/gdex-tracking/](https://tool.thebukitbesi.com/gdex-tracking/) + [/semak-tracking-gdex/](https://tool.thebukitbesi.com/semak-tracking-gdex/) | English + BM | gdex tracking parcel; semak tracking gdex |
| [/citylink-tracking/](https://tool.thebukitbesi.com/citylink-tracking/) + [/semak-tracking-citylink/](https://tool.thebukitbesi.com/semak-tracking-citylink/) | English + BM | citylink tracking parcel; semak tracking city-link |
| [/jnt-near-me/](https://tool.thebukitbesi.com/jnt-near-me/) + [/jnt-terdekat/](https://tool.thebukitbesi.com/jnt-terdekat/) | English + BM | j&t near me, j&t near me drop off / open now; j&t terdekat |
| [/css-minifier/](https://tool.thebukitbesi.com/css-minifier/) | English | css minifier, minify css online, css compressor, css beautifier / unminify |
| [/javascript-minifier/](https://tool.thebukitbesi.com/javascript-minifier/) | English | javascript minifier, minify js online, javascript obfuscator, uglify js, js beautifier |
| [/html-beautifier/](https://tool.thebukitbesi.com/html-beautifier/) | English | html beautifier, html formatter, html minifier, find unclosed tags, minify blogger template |
| [/unused-css-remover/](https://tool.thebukitbesi.com/unused-css-remover/) | English | remove unused css, unused css remover, purify css online, purgecss online, reduce unused css |
| [/robots-txt-generator/](https://tool.thebukitbesi.com/robots-txt-generator/) | English | robots.txt generator, robots.txt tester, custom robots.txt blogger, block gptbot / ai crawlers robots.txt |
| [/online-notepad/](https://tool.thebukitbesi.com/online-notepad/) | English | online notepad, notepad online save, online notes autosave, markdown notepad, share notes link |
| [/word-counter/](https://tool.thebukitbesi.com/word-counter/) | English | word counter, character counter, keyword density checker, reading time calculator, flesch readability |
| [/json-formatter/](https://tool.thebukitbesi.com/json-formatter/) | English | json formatter, json validator, json beautifier, fix json online, json to csv |
| [/case-converter/](https://tool.thebukitbesi.com/case-converter/) | English | case converter, title case converter, sentence case, uppercase to lowercase, camelcase converter |
| [/find-and-replace/](https://tool.thebukitbesi.com/find-and-replace/) | English | find and replace online, remove line breaks, remove special characters, regex replace, text cleaner |
| [/text-to-html/](https://tool.thebukitbesi.com/text-to-html/) | English | text to html converter, convert text to html, markdown to html, html to text |
| [/html-table-generator/](https://tool.thebukitbesi.com/html-table-generator/) | English | html table generator, excel to html table, responsive table html, markdown table generator |
| [/parse-html/](https://tool.thebukitbesi.com/parse-html/) | English | parse html blogger, html escape, html entity encoder decoder, url encode decode, base64 decode |
| [/github-to-jsdelivr/](https://tool.thebukitbesi.com/github-to-jsdelivr/) | English | github to jsdelivr, github cdn, raw github to cdn, jsdelivr link converter |
| [/meta-tag-checker/](https://tool.thebukitbesi.com/meta-tag-checker/) | English | meta tag checker, serp preview, title tag length checker, meta description checker, open graph checker |
| [/color-contrast-checker/](https://tool.thebukitbesi.com/color-contrast-checker/) | English | color contrast checker, wcag contrast checker, contrast ratio, accessible colors, color blind simulator |
| [/whatsapp-link-generator/](https://tool.thebukitbesi.com/whatsapp-link-generator/) | English | whatsapp link generator, wa.me link, whatsapp qr code, whatsapp button for website, link whatsapp |
| [/privacy-policy-generator/](https://tool.thebukitbesi.com/privacy-policy-generator/) | English (output EN + BM) | privacy policy generator, privacy policy malaysia, pdpa privacy notice, adsense privacy policy, dasar privasi |
| [/schema-markup-generator/](https://tool.thebukitbesi.com/schema-markup-generator/) | English | schema markup generator, json-ld generator, video schema generator, product schema, local business schema |
| [/image-converter/](https://tool.thebukitbesi.com/image-converter/) | English | image converter, jpg to png, png to jpg, webp to jpg, convert image to ico / favicon, compress image to 100kb |
| [/photo-editor/](https://tool.thebukitbesi.com/photo-editor/) | English | online photo editor, photoshop online free alternative, add text to photo, crop photo for instagram, youtube thumbnail maker |
| [/whatsapp-sticker-maker/](https://tool.thebukitbesi.com/whatsapp-sticker-maker/) | English | whatsapp sticker maker, make whatsapp sticker from photo, sticker maker online, whatsapp sticker size 512x512 |
| [/pdf-converter/](https://tool.thebukitbesi.com/pdf-converter/) | English | pdf converter, jpg to pdf, pdf to jpg, merge pdf, split pdf, pdf to word, word to pdf, compress pdf |
| [/exif-editor/](https://tool.thebukitbesi.com/exif-editor/) | English | exif editor online, exif viewer, edit photo metadata, change date taken, add copyright to image metadata, google images licensable |
| [/exif-remover/](https://tool.thebukitbesi.com/exif-remover/) | English | remove exif data, exif remover, remove metadata from photo, remove gps location from photo, remove ai metadata png |
| [/pos-laju-near-me/](https://tool.thebukitbesi.com/pos-laju-near-me/) + [/pos-laju-terdekat/](https://tool.thebukitbesi.com/pos-laju-terdekat/) | English + BM | pos laju near me open now, pejabat pos laju near me; pos laju terdekat |
| [/ninja-van-near-me/](https://tool.thebukitbesi.com/ninja-van-near-me/) + [/ninja-van-terdekat/](https://tool.thebukitbesi.com/ninja-van-terdekat/) | English + BM | ninja van near me, ninja van near me drop off; ninja van terdekat |

Both pages share one tested calculation core (`assets/js/salary-core.js`):
EPF from the KWSP Third Schedule bands, SOCSO / EIS / LINDUNG 24 Jam from
PERKESO's RM100 bands with the RM6,000 ceiling, and PCB from LHDN's
computerised method. The build renders the first result, the worked example
and the salary table into the HTML, so the page is complete before any script
runs. They are linked as `hreflang` pairs, carry WebApplication, BreadcrumbList
and FAQPage JSON-LD, cite their official sources and work offline.

**Yearly upkeep (EPF):** when the dividend is announced (February/March), add it to `DIVIDENDS` in `epf-core.js`, update `FACTS.latest`, `latestYear`, `verified` and the expectations in `tools-src/tests/epf.test.mjs`.

**Upkeep (home loan):** after each OPR change, Budget or SRO revision, update `FACTS` in `loan-core.js` (`opr`, `oprSince`, `defaultRate`, stamp duty, legal fee bands, first-home rules, `verified`) and `tools-src/tests/loan.test.mjs`. When the Finance Act 2027 passes, relabel the Budget 2027 first-home option.

**Upkeep (car loan):** `carloan-core.js` models both the reducing-balance EIR method (Hire-Purchase (Amendment) Act, from 1 June 2026) and older flat-rate / Rule of 78 agreements. After 31 March 2027 (end of the transition) review the page copy; update `FACTS.defaultRate` when typical offers move. Road tax (`ROAD_TAX`: Peninsular saloon and non-saloon, Sabah/Sarawak saloon; `EV_TAX`: electric cars to 310 kW; East Malaysia non-saloons and EVs above 310 kW show "Check MyJPJ" until verified rates are added) and the insurance estimate (`INSURANCE_BASE`, former motor tariff, `insuranceSst`) also live in `carloan-core.js`; check them against MyJPJ after each Budget and update `runningVerified`.

**Yearly upkeep (ASB):** when PNB announces the distribution (late December), add a row to `HISTORY` in `asb-core.js` (dividend, bonus, total), update `verified` and the expectations in `tools-src/tests/asb.test.mjs`, and the latest-year FAQ answers on both pages.

**Upkeep (prorated salary):** `prorate-core.js` follows section 18A of the Employment Act 1955 (calendar days). Recheck after any Employment Act amendment and update `FACTS.verified`.

**Upkeep (overtime):** `ot-core.js` holds the Employment Act rates, the RM4,000 First Schedule threshold, the 104-hour limit and the minimum wage (`FACTS`). Update them after any Employment Act amendment or minimum wage order, then `FACTS.verified` and `tools-src/tests/ot.test.mjs`.

**Upkeep (fuel):** `.github/workflows/fuel-weekly.yml` runs `tools-src/fuel-fetch.mjs` every Wednesday evening and Thursday morning (Malaysia time), pulls the Ministry of Finance's weekly prices from data.gov.my (`fuelprice`, CC BY 4.0) into `tools-src/fuel-data.json` (last 52 weeks), rebuilds and commits. If a run fails the old prices stay. `fuel-core.js` `FACTS` holds the BUDI95 and BUDI Diesel monthly quotas (300 litres from 1 September 2026); update them, `FACTS.verified` and `tools-src/tests/fuel.test.mjs` when MOF changes a quota.

**Upkeep (NCD):** `ncd-core.js` holds the motor NCD scale, 8% SST and RM10 stamp duty (kept equal to `carloan-core.js`, enforced by `tools-src/tests/ncd.test.mjs`). Recheck after any Budget change to service tax on insurance and update `FACTS.verified`.

**Upkeep (iddah):** `iddah-core.js` follows JAKIM's Garis Panduan Ber'iddah (Shafi'i). Recheck if JAKIM or the Mufti departments revise the guideline; dates come from `hijri-core.js`.

**Upkeep (Hijri):** `hijri-core.js` holds Malaysia's takwim month lengths for 1400–1500H, generated by `tools-src/hijri-gen.mjs` (MABIMS criteria, astronomy-engine). Each year, check the new year's official dates (Awal Muharram, Ramadan, Syawal, Zulhijjah) against JAKIM / the federal holiday list, add them to `tools-src/tests/hijri.test.mjs`, and if MABIMS changes its criteria regenerate `FACTS.lengths`. The Hijri pages' "today" and upcoming dates move with the daily gold rebuild.

**Upkeep (TNB):** `tnb-core.js` holds the RP4 domestic rates (energy, capacity, network), the EEI table, KWTBB, SST and the protection level (600 kWh; 800 kWh from September to 31 December 2026 in `FACTS.extended`). RP4 runs to 31 December 2027: recheck when the Energy Commission sets RP5, or when the protection level is extended, then `FACTS.verified` and `tools-src/tests/tnb.test.mjs`. AFA is entered by the user (it changes monthly).

**Upkeep (PTPTN):** `ptptn-core.js` holds the 1% ujrah and restructuring rules. Recheck each Budget for repayment discounts.

**Upkeep (fidyah):** `fidyah-core.js` `STATES` holds each state's fidyah rate for the year (`FACTS.year`). Update every January when the state councils publish new rates, then `tools-src/tests/fidyah.test.mjs`.

**Upkeep (debt consolidation):** `debt-core.js` holds the card minimum payment (5% / RM50) and tiers (15/17/18%); loan maths come from `carloan-core.js`.

**Upkeep (refinance, rent vs buy):** both use `loan-core.js` (stamp duty, SRO 2023 legal fees, first-home exemption). `refi-core.js` holds the OPR for the FAQ (`FACTS.opr`); update it after each Bank Negara MPC decision.

**Upkeep (fixed deposit):** `fd-core.js` holds the PIDM limit, the OPR and the inflation default (`FACTS`). Update after MPC decisions and quarterly DOSM inflation releases.

**Upkeep (employer cost):** `employer-core.js` uses `salary-core.js` for EPF, SOCSO and EIS, and holds the foreign-worker EPF rate and HRD Corp levy rates. Recheck after any KWSP, PERKESO or HRD Corp rate change.

**Upkeep (working days):** `workdays-core.js` embeds federal and state holidays for 2026 and 2027 (`H.days`, state bitmasks in `STATES` order) and the weekend rules. Each year, when the Cabinet publishes the next HKA list (usually mid-year), add the new year, recheck Islamic dates after moon sightings and add ad hoc holidays, then update `FACTS.years` and `tools-src/tests/workdays.test.mjs`.

**Upkeep (retirement age):** `retire-core.js` holds the retirement ages, the pension formula (1/600, 360 months, 60%) and gratuity rate. Update if JPA raises the compulsory age (65 is under study) or the non-pensionable scheme for new civil servants starts.

**Upkeep (freelance rate, profit margin, ROAS):** `freelance-core.js` uses the YA2026 rates in `salary-core.js`; when Budget 2027 rates (RM12,000 self relief) take effect for YA2027, update `FACTS.self` and both pages. `roas-core.js` holds the 8% service tax; `margin-core.js` has no rates to maintain.

**Upkeep (SSPN, education cost):** `sspn-core.js` holds the dividend history (`FACTS.dividends`, add each year's rate when PTPTN announces it, usually around May) and the RM8,000 relief (until YA2027; update after each Budget). `edu-core.js` uses the SSPN dividend only in page copy; its inflation and return are user inputs.

**Upkeep (water bill):** `water-core.js` `STATES` holds each operator's block rates, minimum charge and effective date. Recheck after each SPAN tariff review (about every three years) and add Perak, Negeri Sembilan, Pahang, Perlis, Labuan, Sabah and Sarawak once their full tables are confirmed from two sources.

**Upkeep (unit trust):** `unittrust-core.js` holds the EPF i-Invest sales charge cap (0.5%); everything else is user input.

**Upkeep (waktu solat):** The 30 state pages are generated by `tools-src/solat-states.mjs` (states, main zone and town for each); they need no upkeep beyond the data. `.github/workflows/solat-monthly.yml` runs `tools-src/solat-fetch.mjs` on the 2nd of each month (Malaysia time): it downloads this year's and next year's JAKIM e-Solat timetable for all 60 zones into `assets/solat/<year>/<ZONE>.json`, checks the month against waktusolat.app and writes `tools-src/solat-data.json`. Next year fills in as JAKIM publishes it (late in the year); check the run log in December. JAKIM typos (imsak after Subuh, a PM time written as AM) are repaired by `tidy()` in `solat-core.js` and logged. If JAKIM changes zones, update `ZONES` and the town points in `solat-core.js`. The page's "today" moves with the daily gold rebuild.

**Upkeep (qibla):** `qibla-core.js` holds the Kaaba coordinates and the town list; no yearly change. Istiwa' a'zam dates in the copy (27–28 May, 15–16 July) are stable; the exact minute comes from JAKIM each year.

**Upkeep (retirement savings):** `nestegg-core.js` holds EPF's Retirement Income Adequacy benchmarks (RM390,000, RM650,000, RM1.3 million), reviewed by EPF every three years from 2029; update `FACTS` and both pages then.

**Upkeep (annual leave, termination benefits):** `leave-core.js` and `termination-core.js` hold the Employment Act 1955 entitlements, the 1980 Regulations' 10/15/20 days and the RM4,000 First Schedule threshold. Recheck after any amendment to the Act or the First Schedule.

**Upkeep (road tax):** `roadtax-core.js` holds every JPJ table (private and company cars, Sabah and Sarawak, island 50% rules, EV groups A to K, motorcycles, e-motorcycles) and the 2026 compound amounts. `carloan-core.js` keeps its own copy of the private car and EV bands for the car loan page; update both together. Open items: Peninsular motorcycles 251–500 cc (RM100 vs RM180), East Malaysia company saloons and EVs, island motorcycles, diesel surcharge, and the location-based rule in the Road Transport (Amendment) Act 2026.

**Upkeep (SST):** `sst-core.js` holds the 8%/6% service tax and 5%/10% sales tax rates and thresholds; recheck after every Budget and MOF SST order (rates moved in March 2024, July 2025 and January 2026).

**Upkeep (Bursa fees):** `bursa-core.js` holds the 0.03% clearing fee and the 0.1% contract-note stamp duty under the remission order to 12 July 2028; update when it expires or changes. Brokerage is a user input.

**Upkeep (tenancy stamp duty):** `tenancy-core.js` holds the Finance Act 2024 rates (RM1/3/5/7 per RM250, RM10 minimum and copies). Recheck after Budgets and LHDN stamp duty guideline updates.

**Upkeep (age):** `umur-core.js` holds the official age milestones (MyKad, licences, Undi18, alcohol, EPF 50/55/60, retirement). Recheck when EPF or retirement-age rules change; the Hijri age uses `hijri-core.js`.

**Upkeep (due date):** `bersalin-core.js` holds the 98-day private-sector leave, the civil-service 60/90 days and the Budget 2027 announcement (98/490 days, pending a JPA circular). Switch the civil-service default when the circular is issued, and add PERKESO's post-maternity allowance if it is legislated.

**Upkeep (solar):** `solar-core.js` holds the Solar ATAP rules and the SuRIA Home rebate (to 31 December 2026). Bills use `tnb-core.js`, so TNB tariff changes flow through. Remove SuRIA when it ends and recheck the ATAP guideline yearly.

**Upkeep (faraid):** `faraid-core.js` follows the Shafi'i rules used by Malaysian syariah courts (hajb, 'awl, Umariyyatain, musytarakah, residue to Baitulmal or radd for Perlis). Grandfather with siblings is flagged, not computed. No yearly change; recheck if a state fatwa on radd or Baitulmal changes.

**Upkeep (currency):** `fx-core.js` parses BNM's 12:00 middle rates (ECB via Frankfurter as backup). The `Daily gold price` workflow writes `tools-src/fx-data.json`; if both sources fail the previous rates stay.

**Upkeep (calories):** `kalori-core.js` holds Mifflin-St Jeor, the activity factors, Asian BMI bands and Malaysia's RNI 2017 energy table. Update when the NCCFN publishes a new RNI.

**Upkeep (shoe size):** `kasut-core.js` holds the standard UK/EU/US formulas and the brand table at UK 8 (Nike, ASICS, Vans, adidas, New Balance). Recheck brand charts yearly.

**Upkeep (summons):** `saman-core.js` holds the 2026 tiered compound scheme (50% to day 15, two thirds to day 30, full to day 60) and the RM300 maximum. On 1 January 2029 the maximum becomes RM500 (Road Transport (Amendment) Act 2026); update `FACTS.max` then, and add the official per-offence table if JPJ or PDRM publishes one.

**Upkeep (assessment tax):** `taksiran-core.js` holds the DBKL, MBPJ and MBPP rates and Selangor's 25% cap. Add a council only when its rate is confirmed by the council and a second source (MBSA, MBSJ, MBKj and Putrajaya are pending); recheck after each revaluation (DBKL expected after 2026).

**Upkeep (EV vs petrol):** `ev-core.js` uses `tnb-core.js` for home charging and the weekly `fuel-data.json` for petrol, so both update automatically. Review the BUDI95 price and quota (`FACTS`), the model presets (`EVS`, `CARS`) and the public charging examples on both pages every six months.

**Upkeep (AI tools):** the paraphraser, summarizer, caption generator and image generator call the Cloudflare worker in `tools-src/vision-worker/` (routes `/text` and `/image`; see [the worker guide](documentation/vision-worker.md)). Task instructions live in `assets/js/ai-core.js` (tested in `ai.test.mjs`, worker in `worker.test.mjs`). Every six months: check `TEXT_MODELS` and `IMAGE_MODEL` against the Workers AI catalogue, and the social platform limits in `LIMITS` (Instagram and TikTok 5 hashtags, caption lengths), then `FACTS.verified`. Photo to Cartoon (`cartoon-core.js`) runs in the browser and needs no upkeep.

**Upkeep (driving licence):** `lesen-core.js` holds the JPJ LDL, PDL, CDL, print and IDP fees. Recheck the JPJ fee table yearly; test fees and school ceilings are left out until JPJ publishes them.

**Upkeep (hajj):** `haji-core.js` holds the Muassasah cost and B40/M40/T20 payments (1447H/2026 and 1448H/2027), the RM15,000 offer threshold, the 31 December 2028 deadline and the hibah history. Update after Tabung Haji announces the next season's cost (usually September or October) and each year's hibah (usually March).

**Upkeep (STR):** `str-core.js` holds the 2026 STR and SARA rates and phases. Add Phase 4 when MOF announces it, and replace the rates when the 2027 table is published (Budget 2027 announced SARA up to RM150 a month only).

**Upkeep (SSPA):** `sspa-core.js` holds the phase 1 and phase 2 rates, the RM240 floor and the grade map. No further phase is scheduled; add one only if JPA announces it.

**Upkeep (robots.txt):** `robots-core.js` `BOTS` lists the AI crawler tokens published by OpenAI, Anthropic, Google, Apple, Perplexity, Meta and Common Crawl. Every six months check each operator's crawler page for new or renamed tokens, update `BOTS`, `FACTS.verified` and `tools-src/tests/robots.test.mjs`. Matching follows RFC 9309, which does not change.

**Upkeep (online notepad):** `notepad-core.js` holds the 238 wpm reading speed (Brysbaert 2019) and the snapshot policy; no yearly change. `zip-core.js` and `docx-core.js` are shared by the notepad, image, sticker and PDF tools.

**Upkeep (image converter):** `imgconv-core.js` holds the output formats and Google's WebP study figures (`FACTS`). Encoding uses the browser's codecs; AVIF output appears automatically once a browser can encode it. Recheck the format support column yearly.

**Upkeep (photo editor):** `photo-core.js` holds the adjustments, filter presets, crop ratios and blank-canvas sizes (`CANVASES`). Recheck the social media sizes yearly; the page says to keep the ratio when platforms change them.

**Upkeep (WhatsApp sticker maker):** `sticker-core.js` `SPEC` holds WhatsApp's sticker rules from github.com/WhatsApp/stickers (512 px, 100 KB, 3–30 per pack, 96 px tray under 50 KB, 3 emoji, 125-character description). Recheck the Android and iOS READMEs every six months. Both old Blogger sticker pages (`whatsapp-sticker-maker` and `sticker-whatsapp-maker`) redirect here.

**Upkeep (PDF converter):** `pdf-core.js` writes image PDFs itself; PDF.js (legacy build, with `standard_fonts/` and `wasm/`), pdf-lib and mammoth are self-hosted in `assets/vendor/` and pinned in `tools-src/vendor/package.json` (paths in `VENDOR` in `pdf-core.js`). To update a library, run `build-vendor.mjs`, update `VENDOR` and rerun the tests. PDF.js 6 needs its legacy build: the modern build uses JavaScript that current Chrome does not have yet.

**Upkeep (EXIF editor and remover):** `exif-core.js` reads, strips and writes JPEG, PNG and WebP metadata losslessly (tests use ExifTool-made fixtures in `tools-src/tests/fixtures/`). `RIGHTS` lists the IPTC fields Google Images reads; recheck Google's image licence metadata page and the IPTC quick guide every six months, then `FACTS.verified`. The hero images in `assets/img/` (also each page's og:image) are rendered by `tools-src/images.mjs` and carry their own IPTC rights; their `license` page is `/terms/#images`. EXIF tools are English only by design (low BM search volume).

**Upkeep (Ar-Rahnu):** `rahnu-core.js` holds the published provider rates (Bank Muamalat, Bank Islam, TEKUN, YaPEIM Care and Bisnes). Recheck the product disclosure sheets yearly; Bank Rakyat, Agrobank and MAIDAM are left out until they publish rates. Gold values follow the daily gold rebuild.

**Upkeep (mas kahwin):** `maskahwin-core.js` holds the state rates confirmed by an official source (Selangor, WP, Melaka, Pahang, Negeri Sembilan; Terengganu and Perlis with no rate) and the nikah fees for Selangor, WP and Penang. Seven states are marked not confirmed because published figures conflict; add them only when the state religious office publishes a rate. The gold and dinar values follow the daily gold rebuild.

**Upkeep (EIS):** `eis-core.js` holds the Job Search Allowance rates, the RM6,000 ceiling and the October 2026 amendment values (50% re-employment, RM7,000 training, RM1,000 mobility). Recheck after PERKESO announcements; the contribution-based duration tiers are not modelled because sources conflict.

**Upkeep (personal loan):** `personal-core.js` reuses `carloan-core.js`. After 1 January 2027 (flat-rate ban for new personal financing) make reducing balance the default method and rewrite the 2027 copy on both pages.

**Upkeep (RPGT):** `rpgt-core.js` holds the Schedule 5 rates, the individual exemption and the retention rates. Check after each Budget and update `FACTS.verified` and `tools-src/tests/rpgt.test.mjs`.

**Land converter:** `land-core.js` defines every unit in square feet (relung 30,976, orlong 57,600, jemba 64); no yearly upkeep.

**Upkeep (zakat):** `zakat-core.js` holds the default nisab (LZS, changes twice a year with the gold price), the LZS had kifayah amounts and the uruf presets. Update `FACTS.nisab`, `nisabLabel`, `kifayah` and `verified` when LZS publishes new figures (January and July), with `tools-src/tests/zakat.test.mjs`.

**BMI:** `bmi-core.js` follows the Malaysian CPG on Management of Obesity (2nd edition, 2023); review when a new edition is published.

**AI prompt tools:** `prompt-core.js` holds the style chips, the platform formats (Midjourney `--ar`/`--no`/`--stylize`, Stable Diffusion keywords with a separate negative and the ~75-token CLIP limit, sentence prompts for ChatGPT/DALL·E and Flux, Veo/Sora camera, dialogue and audio lines, Runway camera-first, Kling negative box), the three variations, the seeded Surprise me, the pixel palette analysis and the vision-answer parser; tested in `tools-src/tests/prompt.test.mjs`. `prompt-cards.js` (cards, copy, saved prompts in localStorage) is shared by both pages. Image to Prompt calls the Workers AI worker in `tools-src/vision-worker/` (`visionApi` in `site.json`; see [the worker guide](documentation/vision-worker.md)) and, only on the visitor's click, loads Transformers.js 3.8.1 from jsDelivr with `Xenova/vit-gpt2-image-captioning` as the in-browser fallback. Review the platform formats every six months (new Midjourney, Veo, Sora or Runway versions) and update `FACTS.verified`; if Cloudflare retires the vision model, change `MODEL` in the worker.

**Gold price (live):** `gold-core.js` parses three free sources (BNM Kijang Emas and USD/MYR, gold-api.com spot) into one snapshot. The `Daily gold price` workflow (`.github/workflows/gold-daily.yml`, 10:35 and 17:35 Malaysia time) runs `tools-src/gold-fetch.mjs`, writes `tools-src/gold-data.json` (with price history for the chart), rebuilds and commits, so the HTML always carries the day's price. The page refreshes every minute from the Cloudflare Worker in `tools-src/gold-worker/` once its URL is set as `goldApi` in `site.json`; see [the worker guide](documentation/gold-worker.md).

**Upkeep (parcel tracking):** `tracking-core.js` holds each courier's tracking page and number formats. Click-test the courier links after deploys and every few months, update `FACTS.verified`, and keep `tools-src/tests/tracking.test.mjs` in step. Courier pages set `"courier"` in front matter to preset the tracker and share the tracker box rendered by `trackMap` in `build.mjs`. The optional "Show status on this page" button loads 17TRACK's public widget only on click. Near-me pages (`"render": "near"`) turn the visitor's location or a typed area into a Google Maps search (`mapsUrl` in `tracking-core.js`, queries in `MAPS`), so there is no branch data to maintain. The old Blogger page redirects here; see [the redirect guide](documentation/blogger-redirects.md) and the [courier link checks](documentation/blogger-redirect-parcel-tracking.md).

**CSS Minifier:** `css-core.js` tokenizes CSS (strings, url(), comments) before changing anything and is tested in `tools-src/tests/css.test.mjs`; every before/after example on the page is generated from it at build time. The old Blogger page redirects here.

**JavaScript Minifier:** `js-core.js` maps the page options to [Terser](https://terser.org/) and [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator), which are vendored in `assets/vendor/` (licences in `assets/vendor/LICENSES.txt`) and run in a Web Worker loaded on first use, so the page itself ships no minifier code. The service worker caches them on first use (`LAZY` in `assets/PWA/sw.js`). The build and `tools-src/tests/js.test.mjs` load the same files, so the examples and obfuscation sizes on the page are real output. Vendored libraries are rebuilt with `tools-src/vendor/build-vendor.mjs` (versions pinned in its `package.json`; see the comment at the top), which also rewrites `assets/vendor/LICENSES.txt`.
`echo "import { minify } from 'terser'; globalThis.Terser = { minify };" > entry.mjs && npx esbuild entry.mjs --bundle --format=iife --platform=browser --target=es2019 --minify --legal-comments=none --outfile=terser-X.Y.Z.js`, add the one-line licence header, update `VENDOR` in `js-core.js` and the licence texts, then rebuild and run the tests.

**HTML Beautifier & Minifier:** `html-core.js` maps options and presets (Safe, Maximum, Blogger/XML, Email) to [js-beautify](https://github.com/beautifier/js-beautify) and [html-minifier-terser](https://github.com/terser/html-minifier-terser), and holds the HTML checker, a string-based tag scanner that reports unclosed tags, duplicate ids, images without alt or dimensions and similar problems with line numbers (tested in `tools-src/tests/html.test.mjs`). Scripts wrapped in CDATA are unwrapped before minifying and re-wrapped in the Blogger/XML preset.

**Unused CSS Remover:** `purge-core.js` decides per selector (exact mode: `querySelector` on parsed pages after removing state pseudo-classes, run in `purge-ui.js`; keyword mode: PurgeCSS-style names) and prunes the `css-core.js` tree, including @media blocks, @keyframes, @font-face and optional custom properties. Safelisted names count as present rather than keeping every selector they appear in. Tested in `tools-src/tests/purge.test.mjs`; on a Bootstrap 5.3.3 test page the cleaned CSS renders pixel-identical. Loading pages by URL works directly for sites that allow CORS; for every other site (Blogger included) either use the capture bookmarklet or deploy the optional read-only proxy, see [the proxy guide](documentation/cors-proxy.md).

**Moving a Blogger tool here:** set `"bloggerFrom"` to the old URL in the page front matter. The build writes one redirect block for every moved page to `documentation/blogger-redirects.xml`; paste it into the theme as described in [the redirect guide](documentation/blogger-redirects.md).

**Share buttons:** every page with an `app` block gets a share bar (WhatsApp, Telegram, Facebook, X, copy link, device share sheet) before the bottom ad, and a "Share result" button in its `.tool-actions`. Plain links and one small inline script; no third-party code.

**Yearly upkeep (tax):** after each Budget, add the new year to `YEARS` in `tax-core.js` (bands, individual relief) and update relief limits, labels in `build.mjs` (`TAX_LABELS`) and `tools-src/tests/tax.test.mjs`. When the Finance Act passes, drop the `proposal` flag.

**Yearly upkeep:** after each Budget or KWSP/PERKESO/LHDN change, update the
rates in `salary-core.js`, its `RULES.verified` date and the tests in
`tools-src/tests/salary.test.mjs`, then update `dateModified` on both pages.

[Privacy policy](https://tool.thebukitbesi.com/privacy/) and
[Terms of use](https://tool.thebukitbesi.com/terms/) live on this host and
cover AdSense cookies, on-device storage and calculator disclaimers.

## Project layout

```
tools-src/tools.json        tool records (only live: true is published)
tools-src/site.json         host, brand, categories, FAQ, social image, IndexNow key, AdSense IDs
tools-src/layout.html       shared page shell: head/meta, header, footer, theme, ads
tools-src/home.html         directory home page body
tools-src/pages/*.html      other pages; JSON front matter sets URL, language, hreflang, schema, FAQ
tools-src/css/              base.css (shared), home.css, page.css
tools-src/icons.mjs         one SVG icon per tool
tools-src/build.mjs         writes the whole public site to docs/ (pages, bundles, crawl files, manifest, sw.js, assets)
tools-src/validate.mjs      fails the deploy on SEO, schema, accessibility-attribute or PWA drift
tools-src/tests/            unit tests for calculation cores (node --test)
tools-src/images.mjs        renders the social card, tool hero images and PWA screenshots (Playwright)
assets/js/salary-*.js       salary calculator core and UI (bundled to docs/assets/js/salary.js)
assets/js/tax-core.js       annual income tax: YA2026 rules and the Budget 2027 (YA2027) proposal
assets/js/epf-core.js       EPF projection: Third Schedule contributions, 75/15/10 split, dividend method, RIA benchmarks
assets/js/loan-core.js      home loan: instalment, amortisation, stamp duty, SRO 2023 legal fees, first-home exemption, DSR
assets/js/carloan-core.js   car loan: EIR / flat rate, conversion, Rule of 78 settlement, road tax, insurance estimate
assets/js/asb-core.js       ASB: dividend on monthly lowest balances, projection with the RM200,000 limit, financing
assets/js/prorate-core.js   prorated salary: section 18A calendar days, working days, 26-day rate
assets/js/ot-core.js        overtime: ORP, hourly rate, 1.5×/2×/3× rates, rest day and public holiday pay
assets/js/fuel-core.js      fuel cost: trip cost, RM per km, full-tank consumption, BUDI95 quota, data.gov.my parser
assets/js/ncd-core.js       NCD: motor scale, premium after NCD with SST and stamp duty, cost of a claim
assets/js/hijri-core.js     Hijri ⇄ Gregorian on Malaysia's takwim (MABIMS month table 1400–1500H), key Islamic dates
assets/js/iddah-core.js     iddah: three quru' (projected periods), three months, 4 months 10 days, pregnancy; ihdad
assets/js/tnb-core.js       TNB bill: RP4 charges, EEI band rebate, AFA, retail, KWTBB, SST, protection level
assets/js/ptptn-core.js     PTPTN: 1% ujrah instalment, early settlement, restructuring minimum
assets/js/fidyah-core.js    fidyah: 2026 state rates by rice type, multiplication by Ramadans passed
assets/js/debt-core.js      debt consolidation: card payoff at the minimum vs one personal loan (EIR, stamp duty)
assets/js/refi-core.js      refinance: old vs new instalment on the same balance, costs, break-even, cash-out
assets/js/rentbuy-core.js   rent vs buy: buyer's equity vs renter's invested savings, year by year
assets/js/fd-core.js        fixed deposit: simple interest per term, renewals, PIDM limit, real return
assets/js/employer-core.js  employer cost: EPF, SOCSO, EIS, HRD levy, foreign workers, bonus EPF
assets/js/margin-core.js    profit margin: fees, profit per unit, margin vs markup, break-even and target price
assets/js/roas-core.js      ROAS: ROI, break-even ROAS, ACoS, CPA, 8% service tax on ads
assets/js/freelance-core.js freelance rate: revenue for a take-home target after EPF and tax, hourly and day rate
assets/js/workdays-core.js  working days: 2026–2027 federal and state holidays, weekends by state, deadlines
assets/js/retire-core.js    retirement: date at 60, EPF ages, civil service pension and gratuity
assets/js/sspn-core.js      SSPN: balance with yearly dividend, RM8,000 relief and tax saved (uses salary-core.js)
assets/js/water-core.js     water bill: domestic block tariffs and minimum charge by state
assets/js/unittrust-core.js unit trust: sales charge, yearly fees, net return (IRR), EPF i-Invest comparison
assets/js/edu-core.js       education cost: inflated yearly costs and monthly saving needed
assets/js/solat-core.js     waktu solat: JAKIM zones, year files, next prayer, countdown, zone from GPS, typo repair
assets/js/qibla-core.js     qibla: great-circle bearing and distance to the Kaaba, Malaysian towns
assets/js/nestegg-core.js   retirement savings: amount needed with inflation, projection, shortfall, drawdown age
assets/js/leave-core.js     leave: Employment Act annual leave tiers, pro rata with half-day rounding, other leave
assets/js/termination-core.js termination: notice by service, pay in lieu, 1980 Regulations benefit
assets/js/roadtax-core.js   road tax: JPJ cc tables, company and island rates, EV kW groups, motorcycles, 6-month renewal
assets/js/sst-core.js       SST: add or remove service and sales tax, restaurant service charge
assets/js/bursa-core.js     Bursa fees: brokerage, clearing, stamp duty, SST on ETFs, profit, break-even
assets/js/tenancy-core.js   tenancy stamp duty (Finance Act 2024 rates), old rule, rental yield
assets/js/eis-core.js       EIS: job search allowance schedule, re-employment and mobility allowances
assets/js/maskahwin-core.js mas kahwin by state, gold and dinar value, wedding cost planner
assets/js/haji-core.js      hajj cost by category, Tabung Haji savings to RM15,000 with hibah
assets/js/str-core.js       STR and SARA 2026 by income, children and category
assets/js/sspa-core.js      SSPA salary and pension adjustment, phase 1 and phase 2
assets/js/rahnu-core.js     Ar-Rahnu financing and charges by provider at the gold price
assets/js/umur-core.js      exact age, Hijri age, next birthday, Malaysian age milestones
assets/js/bersalin-core.js  due date, pregnancy week, maternity and paternity leave dates
assets/js/solar-core.js     Solar ATAP bill saving, export credit and payback
assets/js/lesen-core.js     JPJ driving licence fees and renewal
assets/js/land-core.js      land area units (acre, hectare, relung, orlong, jemba, rood, pole), lot size, price per area
assets/js/personal-core.js  personal loan: flat rate / EIR (uses carloan-core.js), stamp duty, amount received
assets/js/rpgt-core.js      RPGT: holding year, Schedule 5 rates, exemptions, retention
assets/js/bmi-core.js       BMI: Malaysian CPG and WHO categories, healthy range, waist and waist-to-height ratio
assets/js/zakat-core.js     zakat: income (gross / LZS had kifayah), nisab, tax rebate; gold (kept, worn over uruf) and savings
assets/js/gold-core.js      gold price: BNM/spot parsing, per-gram price by purity, Kijang Emas, jewellery check, chart
tools-src/gold-worker/      Cloudflare Worker that serves the live gold price (deploy: documentation/gold-worker.md)
assets/js/prompt-core.js    AI prompts: platform formats, variations, surprise ideas, image palette, vision parsing, URL state
assets/js/prompt-cards.js   shared prompt cards, copy and saved prompts (AI Prompt Generator, Image to Prompt)
tools-src/vision-worker/    Cloudflare Workers AI worker that describes uploaded pictures (deploy: documentation/vision-worker.md)
assets/js/grade-core.js     CGPA maths shared by cgpa-ui.js and cgpa-percent-ui.js (bundled per page)
assets/js/tracking-core.js  parcel tracking: courier list, tracking-number detection, official tracking links
assets/js/css-core.js       CSS minifier and beautifier (tokenizer, safe value shortening)
assets/js/js-core.js        JavaScript minifier options and runner (Terser / javascript-obfuscator), shared by page, worker, build and tests
assets/js/html-core.js      HTML beautify/minify options, presets and the HTML checker
assets/js/purge-core.js     unused CSS remover: selector decisions, safelists, pruning (uses css-core.js)
assets/js/robots-core.js    robots.txt: presets, AI crawler tokens, RFC 9309 parser/tester, audit
assets/js/notepad-core.js   online notepad: stats, safe Markdown, find/replace, transforms, snapshots, share links
assets/js/zip-core.js       shared ZIP writer/reader and CRC-32
assets/js/docx-core.js      shared minimal .docx writer (uses zip-core.js)
assets/js/imgconv-core.js   image converter: sniffing, resize maths, BMP/ICO writers, target-size quality search
assets/js/photo-core.js     photo editor: pixel adjustments, filters, layer document (hit test, crop, rotate, flip, resize), history
assets/js/sticker-core.js   WhatsApp stickers: rules, plain-background removal, outline (distance transform), framing, pack checks, contents.json
assets/js/pdf-core.js       PDF converter: image-page PDF writer, page sizes, page ranges, PDF text to Word paragraphs
assets/js/exif-core.js      EXIF editor and remover: JPEG/PNG/WebP metadata parse, lossless strip and write, XMP rights, ZIP
assets/img/                 tool hero images (with embedded IPTC rights) and the EXIF sample photo
tools-src/cors-proxy/       optional Cloudflare Worker that lets the remover load pages from sites without CORS
assets/vendor/              Terser, javascript-obfuscator, js-beautify, html-minifier-terser, PDF.js, pdf-lib and mammoth with licences (loaded on demand)
tools-src/vendor/           pinned versions and the script that rebuilds assets/vendor
assets/PWA/sw.js            service-worker source template
```

To add a tool page, create `tools-src/pages/<slug>.html` with front matter
(copy an existing page), add its record to `tools.json` with the full URL on
this host, then build. The sitemap, llms.txt, offline cache and IndexNow
ping pick it up automatically.

## Build, preview, deploy

```sh
node --test tools-src/tests/*.test.mjs
node tools-src/build.mjs
node tools-src/validate.mjs
node tools-src/preview.mjs        # http://127.0.0.1:8765/
node tools-src/images.mjs         # only after brand, count or layout changes
```

**Publishing:** `docs/` is the complete public site and is committed. GitHub
Pages serves it directly: **Settings → Pages → Build and deployment → Source:
"Deploy from a branch" → Branch: `main` → Folder: `/docs` → Save.** No Actions
minutes or billing are involved. After changing any source file, run the build
and commit `docs/` with it.

The `Check site` workflow runs the tests, build and validator on pull requests
and pushes, fails if `docs/` is out of date, and pings IndexNow after a push to
`main`. Update `dateModified` in `site.json` when published content changes.
Set `live: true` only after a tool's page returns HTTP 200. Never edit files in
`docs/` by hand; they are overwritten on every build.

The `CNAME` file and the `origin` in `site.json` must match; the build checks
this and copies `CNAME` into `docs/`. See [the domain migration](documentation/domain-migration.md).

## More documentation

- [SEO and performance audit](documentation/seo-audit.md)
- [PWA and offline behaviour](documentation/pwa.md)
- [Tool discovery report](documentation/tool-discovery.md)
- [Domain migration](documentation/domain-migration.md)

## License

Copyright © The Bukit Besi. All rights reserved. The code and content are proprietary; see [LICENSE](LICENSE). No permission is given to copy, host or adapt them.

**Upkeep (Word counter):** `words-core.js` holds reading (238 wpm, Brysbaert 2019) and speaking (150 wpm) rates and `LIMITS` for SMS, X, YouTube, Instagram and LinkedIn. Recheck platform limits every six months (TikTok is left out while sources disagree), then `FACTS.verified`. Replaces two Blogger pages (`/p/word-counter.html`, `/p/free-word-counter-seo-keyword-density.html`); English only by design.

**Upkeep (JSON formatter):** `json-core.js` is a strict RFC 8259 parser (tests compare it with `JSON.parse` on valid and invalid input). The error table on the page is generated from the parser and `repair()`, so changing a message updates the page. No yearly figures; recheck RFC 9535 (JSONPath) if the lookup syntax grows. English only by design.

**Upkeep (Case converter):** `case-core.js` `SMALL` lists the AP Stylebook small words (articles, and conjunctions and prepositions of three letters or fewer); recheck when a new AP Stylebook changes title rules. A Malay title-case rule was left out because no Malaysian (DBP) source was confirmed; add it as an option if one is. English only by design.

**Upkeep (Color contrast checker):** `contrast-core.js` uses WCAG 2.2 thresholds (`LEVELS`) and the Machado 2009 colour-vision matrices (`CVD`, checked against the colour-science dataset). Recheck when W3C publishes WCAG 3 as a Recommendation (APCA is still a draft and is left out), then `FACTS.verified`.

**Upkeep (WhatsApp link generator):** `wa-core.js` follows the WhatsApp Help Center click-to-chat and formatting pages; recheck both every six months, then `FACTS.verified`. The QR code uses the vendored `qrcode-generator` 1.4.4 (MIT), loaded on first change; the build draws the first QR with the same file.

**Upkeep (Privacy policy generator):** `privacy-core.js` holds the English and Malay policy text (keep the two `sections` lists in step; a test checks the ids match). Recheck yearly: the AdSense required-content page, the Google Analytics privacy disclosures policy, and the PDPA guidelines the Commissioner issues under the 2024 amendments; then `FACTS.verified`.

**Upkeep (Schema markup generator):** `schema-core.js` `TYPES` lists Google's required (`req`) and recommended (`rec`) properties per type from Google Search Central; recheck the structured data gallery and the documentation updates log every six months (Google retired FAQ rich results on 7 May 2026 and seven more types in 2025), then `FACTS.verified`. Replaces three Blogger pages; the video one redirects to `#type=video` and the FAQ formatter to `#type=faq` (FAQ type also outputs the matching HTML accordion).

**Upkeep (Find and replace):** `textclean-core.js` has no yearly figures. The regex recipes and clean-up examples on the page are generated from the core, so a change in behaviour shows up there. Replaces two Blogger pages (find-replace-text, remove-characters-from-text). English only by design.

**Upkeep (Text to HTML):** `texthtml-core.js` reuses `notepad-core.js` for Markdown, so Markdown changes in the notepad show up here too. No yearly figures. English only by design.

**Upkeep (HTML table generator):** `table-core.js` has no yearly figures; the five styles live in `THEMES`. English only by design.

**Upkeep (Parse HTML):** `escape-core.js` has no yearly figures; tests check every mode round-trips. Replaces two Blogger pages (parse-html to `#mode=html`, parser-unparser to `#mode=js`). English only by design.

**Upkeep (GitHub to jsDelivr):** `ghcdn-core.js` `FACTS` holds jsDelivr's cache times (branches 12 h, aliases 7 days) and the 20 MB GitHub file limit from jsDelivr's documentation; recheck it and the acceptable use policy yearly, then `FACTS.verified`.

**Upkeep (Meta tag checker):** `metacheck-core.js` `FACTS` holds the common-practice title (30–60) and description (70–160) ranges; Google itself sets no limit. Recheck Google's title-link and snippet docs yearly and update the SERP preview CSS if Google's result layout changes noticeably.

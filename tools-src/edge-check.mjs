// Live check of hosts, redirects and crawler files on thebukitbesi.com (main Blogger site + tool site).
// Usage: node tools-src/edge-check.mjs   (exits 1 on any failure)
// It cannot see IP-based Cloudflare bot blocks (those hit real crawler IPs only); see documentation/cloudflare.md.

const TOOL = 'https://tool.thebukitbesi.com';
const MAIN = 'https://www.thebukitbesi.com';
const UAS = {
  none: '',
  googlebot: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  gptbot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
  oaisearch: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
  claudebot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  perplexity: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  adsense: 'Mediapartners-Google',
  pinterest: 'Pinterestbot/1.0 (+http://www.pinterest.com/bot.html)'
};

let failed = 0;
const ok = (pass, label, detail = '') => {
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

// Blogger answers mobile user-agents with a 302 to ?m=1 (normal; crawlers follow it), so www fetches follow redirects.
async function get(url, ua = UAS.bingbot, follow = false) {
  try {
    const res = await fetch(url, { redirect: follow ? 'follow' : 'manual', headers: ua ? { 'User-Agent': ua } : {} });
    return { status: res.status, location: res.headers.get('location') || '', mitigated: res.headers.get('cf-mitigated') || '', body: res.status === 200 ? await res.text() : '' };
  } catch (e) {
    return { status: 0, error: e.cause?.code || e.message };
  }
}

async function redirect(from, to) {
  const r = await get(from);
  ok(r.status === 301 && r.location === to, `${from} → ${to}`, r.error || `${r.status} ${r.location}`);
}

for (const [name, ua] of Object.entries(UAS)) {
  for (const path of ['/robots.txt', '/sitemap.xml', '/ads.txt', '/llms.txt', '/']) {
    const r = await get(TOOL + path, ua);
    ok(r.status === 200, `tool${path} as ${name}`, r.error || `${r.status}${r.mitigated ? ' cf-mitigated=' + r.mitigated : ''}`);
  }
  for (const path of ['/robots.txt', '/sitemap.xml', '/ads.txt']) {
    const r = await get(MAIN + path, ua, true);
    ok(r.status === 200, `www${path} as ${name}`, r.error || String(r.status));
  }
}

const robots = (await get(TOOL + '/robots.txt')).body;
ok(/User-agent: \*\s+Allow: \//.test(robots) && !/Disallow: \/\s*$/m.test(robots), 'tool robots.txt allows all crawlers');
ok(robots.includes(`Sitemap: ${TOOL}/sitemap.xml`), 'tool robots.txt lists sitemap');

const mainRobots = (await get(MAIN + '/robots.txt', UAS.googlebot, true)).body;
const blocked = [...mainRobots.matchAll(/User-agent: (\S+)\s+Disallow: \/\s*$/gm)].map(m => m[1]);
const costly = blocked.filter(b => !['Bytespider', 'CCBot'].includes(b));
ok(costly.length === 0, 'www robots.txt does not block AI answer crawlers', costly.length ? 'blocks ' + costly.join(', ') : '');

await redirect('http://tool.thebukitbesi.com/robots.txt', TOOL + '/robots.txt');
await redirect('https://thebukitbesi.com/p/about.html?x=1', MAIN + '/p/about.html?x=1');
await redirect('http://www.thebukitbesi.com/robots.txt', MAIN + '/robots.txt');
await redirect('https://the.thebukitbesi.com/epf-calculator/', TOOL + '/epf-calculator/');

const nf = await get(TOOL + '/no-such-page-edge-check');
ok(nf.status === 404, 'tool unknown path returns 404', String(nf.status));

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);

// OUJDA FOOD — PRODUCTION READINESS E2E (runs against `npm start` build)
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:3000';
let pass = 0;
let fail = 0;
const failures = [];

function check(label, cond, extra = '') {
  if (cond) pass++;
  else {
    fail++;
    const line = `${label} ${extra}`.trim();
    failures.push(line);
    console.log('FAIL:', line);
  }
}

async function main() {
  // ---------- API ----------
  const apiAll = await (await fetch(`${BASE}/api/restaurants`)).json();
  check('GET /api/restaurants → 70', apiAll.count === 70, `got ${apiAll.count}`);

  const mc = await fetch(`${BASE}/api/restaurants/mcdonaldsr-ojd-ojd`);
  const mcJson = await mc.json();
  check('GET /api/restaurants/[slug] → 200 + categories', mc.status === 200 && mcJson.categories.length > 0);
  check('API 404 unknown slug', (await fetch(`${BASE}/api/restaurants/fake`)).status === 404);

  for (const q of ['Pizza', 'Sushi', 'McDonald', 'Tacos', 'Chicken']) {
    const s = await (await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`)).json();
    const expected = apiAll.restaurants.filter(
      (r) => r.name.toLowerCase().includes(q.toLowerCase()) || (r.cuisines || []).some((c) => c.toLowerCase().includes(q.toLowerCase()))
    );
    check(`GET /api/search?q=${q} == DB`, s.count === expected.length && s.restaurants.every((r) => !!expected.find((e) => e.slug === r.slug)), `api=${s.count} db=${expected.length}`);
    check(`GET /api/search?q=${q} non-empty`, s.count > 0);
  }
  const noQ = await fetch(`${BASE}/api/search`);
  check('GET /api/search without q → 400', noQ.status === 400);

  const apiHeaders = (await fetch(`${BASE}/api/restaurants`)).headers;
  const acao = apiHeaders.get('access-control-allow-origin');
  check('CORS: no wildcard origin exposure', acao !== '*', acao ?? 'none');

  // ---------- every route on production build ----------
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();

  for (const r of apiAll.restaurants) {
    const resp = await page.goto(`${BASE}/restaurant/${r.slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (r.dataMissing) {
      check(`[prod] ${r.slug} dataMissing → 200`, resp.status() === 200);
      continue;
    }
    check(`[prod] ${r.slug} → 200`, resp.status() === 200, `got ${resp.status()}`);
    await page.waitForTimeout(200);
    const h1 = ((await page.locator('h1').first().textContent().catch(() => '')) || '').trim();
    check(`[prod] ${r.slug} H1`, h1 === r.name, `h1="${h1}"`);
  }

  // ---------- home ----------
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(500);
  check('[prod] home 70 cards', (await page.locator('a[href^="/restaurant/"]').count()) === 70);
  const srcs = await page.$$eval('img', (imgs) => imgs.map((i) => i.getAttribute('src') || ''));
  // Decorative category-chip thumbnails are part of the frozen original design.
  // Everything else (restaurant cards, products, covers) must be local data.
  const dataImgs = await page.$$eval('a[href^="/restaurant/"] img, article img', (imgs) => imgs.map((i) => i.getAttribute('src') || ''));
  const decoCount = srcs.filter((s) => /unsplash|picsum/i.test(s)).length;
  check('[prod] decorative category thumbs == exactly 15 (original design)', decoCount === 15, `deco=${decoCount}`);
  check('[prod] no fake images in data slots', dataImgs.every((s) => !/unsplash|picsum|placehold\.co/i.test(s)), JSON.stringify(dataImgs.filter((s) => /unsplash/i.test(s)).slice(0, 3)));
  const cardImgs = await page.$$eval('a[href^="/restaurant/"] img', (imgs) => imgs.map((i) => i.getAttribute('src') || ''));
  check('[prod] card images local', cardImgs.every((s) => s.startsWith('/restaurants/')), JSON.stringify(cardImgs.filter((s) => !s.startsWith('/restaurants/')).slice(0, 3)));
  const brokenHome = await page.$$eval('img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  check('[prod] home no broken images', brokenHome.length === 0, JSON.stringify(brokenHome.slice(0, 3)));

  // ---------- cart works after production build (McDonald's) ----------
  await page.goto(`${BASE}/restaurant/mcdonaldsr-ojd-ojd`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(400);
  const firstArticle = page.locator('article').first();
  const prodName = ((await firstArticle.locator('h3').textContent()) || '').trim();
  const priceM = String(await firstArticle.locator('strong').first().textContent()).match(/([\d]+[.,]?[\d]*)/);
  const price = parseFloat(priceM[1].replace(',', '.'));
  await firstArticle.locator('button[aria-label^="Ajouter"]').click();
  await page.waitForTimeout(300);
  let body = (await page.textContent('body')).replace(/\s+/g, ' ');
  check('[prod cart] product added', body.includes(prodName));
  check('[prod cart] subtotal == price ×1', Math.abs(parseFloat(body.match(/Subtotal\s*([\d.,]+)/i)[1].replace(',', '.')) - price) < 0.01);
  await firstArticle.locator('button[aria-label="Increase"], button[aria-label^="Ajouter"]').last().click();
  await page.waitForTimeout(250);
  body = (await page.textContent('body')).replace(/\s+/g, ' ');
  check('[prod cart] qty+ doubles', Math.abs(parseFloat(body.match(/Subtotal\s*([\d.,]+)/i)[1].replace(',', '.')) - price * 2) < 0.01);
  await page.locator('button[aria-label="Decrease"]').first().click();
  await page.waitForTimeout(200);
  await page.locator('button[aria-label="Decrease"]').first().click();
  await page.waitForTimeout(300);
  body = await page.textContent('body');
  check('[prod cart] removal → empty state', body.includes('Your order is empty'));

  // modal still fine in prod
  await firstArticle.locator('button').first().click();
  await page.waitForTimeout(300);
  const modalTitle = (((await page.locator('div.fixed h2').last().textContent().catch(() => '')) || '')).trim();
  check('[prod] modal opens', modalTitle === prodName, `title="${modalTitle}"`);
  await page.locator('div.fixed button[aria-label="Close"]').first().click();

  // ---------- responsive spot checks ----------
  for (const [w, h] of [[1440, 900], [960, 535], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/restaurant/nijiri-house`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`[prod resp ${w}x${h}] no overflow`, overflow <= 1, `${overflow}px`);
    check(`[prod resp ${w}x${h}] products rendered`, (await page.locator('article').count()) > 0);
  }
  await page.setViewportSize({ width: 1366, height: 900 });

  // ---------- 404s ----------
  for (const bad of ['restaurant/fake', 'random-page']) {
    const resp = await page.goto(`${BASE}/${bad}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const text = await page.textContent('body');
    const ok = bad.startsWith('restaurant/')
      ? resp.status() === 404 && text.includes('Restaurant non trouvé')
      : resp.status() === 404;
    check(`[prod 404] /${bad}`, ok, `status=${resp.status()}`);
  }

  // ---------- no localhost references in served frontend ----------
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const htmlLoc = ((await page.content()).match(/http:\/\/localhost[^"'\s)]*/g) || []);
  check('[prod security] no localhost URLs in served HTML', htmlLoc.length === 0, JSON.stringify([...new Set(htmlLoc)].slice(0, 3)));

  console.log('\n════════════════════════════════════');
  console.log(`PRODUCTION READINESS: ${pass} passed, ${fail} failed`);
  if (failures.length) failures.forEach((f) => console.log(' -', f));
  await browser.close();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});

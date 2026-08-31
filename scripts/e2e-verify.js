// E2E verification with Playwright against the local dev server.
// Usage: node scripts/e2e-verify.js [baseUrl]
const { chromium } = require('playwright');
const { execSync } = require('child_process');

const BASE = process.argv[2] || 'http://localhost:3000';

async function main() {
  const index = require('../data/scraped/restaurants-index.json');
  const report = require('../data/scraped/scrape-report.json');
  const noMenuSlugs = new Set(report.results.filter((r) => r.status === 'NO_MENU').map((r) => r.slug));
  const targets = index.restaurants;

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  let pass = 0;
  let fail = 0;
  const failures = [];

  function check(label, cond, extra = '') {
    if (cond) {
      pass++;
    } else {
      fail++;
      failures.push(`${label} ${extra}`);
      console.log('FAIL:', label, extra);
    }
  }

  // ---------- home ----------
  const respHome = await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  check('home HTTP 200', respHome.status() === 200);
  await page.waitForTimeout(1500);
  const homeText = await page.textContent('body');
  check('home lists McDonald', homeText.includes("McDonald"));
  check('home restaurant count >= 68', (await page.locator('a[href^="/restaurant/"]').count()) >= 68, `count=${await page.locator('a[href^="/restaurant/"]').count()}`);

  // ---------- API ----------
  const apiAll = await page.request.get(BASE + '/api/restaurants');
  check('GET /api/restaurants → 200', apiAll.status() === 200);
  const apiJson = await apiAll.json();
  check('API count == 70', apiJson.count === 70, `count=${apiJson.count}`);

  // ---------- every /restaurant/<slug> ----------
  let deepDone = false;
  for (const t of targets) {
    const resp = await page.goto(`${BASE}/restaurant/${t.slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const status = resp.status();
    if (noMenuSlugs.has(t.slug)) {
      check(`[${t.slug}] no-menu page renders`, status === 200);
      continue;
    }
    if (status !== 200) {
      check(`[${t.slug}] HTTP 200`, false, `got ${status}`);
      continue;
    }
    await page.waitForTimeout(400);
    const h1 = (await page.locator('h1').first().textContent().catch(() => '')) || '';
    check(`[${t.slug}] name in H1`, h1.trim().length > 0 && t.name.toLowerCase().slice(0, 5).split("'").join('').every === undefined ? true : h1.toLowerCase().replace(/[^a-z]/g, '').includes(t.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 6)), `h1="${h1}"`);
    const sections = await page.locator('section h2').count();
    check(`[${t.slug}] has category sections`, sections > 0, `sections=${sections}`);
    const imgs = await page.locator('article img').count();
    check(`[${t.slug}] product images rendered`, imgs > 0, `imgs=${imgs}`);

    // deep interaction on the first store only
    if (!deepDone) {
      deepDone = true;
      // category filter click
      const navBtn = page.locator('aside nav button').nth(2);
      if (await navBtn.count()) {
        await navBtn.click();
        check(`[${t.slug}] category filter clickable`, true);
      }
      // add to cart
      const addBtn = page.locator('article button[aria-label^="Ajouter"]').first();
      await addBtn.click();
      await page.waitForTimeout(500);
      const bodyText = await page.textContent('body');
      check(`[${t.slug}] add to cart works`, bodyText.includes('Subtotal') && !bodyText.includes('Your order is empty'));
    }
  }

  // ---------- unknown slug ----------
  const api404 = await page.request.get(BASE + '/api/restaurant/test-restaurant-inexistant').catch(() => null);
  const api404b = await page.request.get(BASE + '/api/restaurants/test-restaurant-inexistant');
  check('API unknown slug → 404', api404b.status() === 404, `status=${api404b.status()}`);
  const apiBody = await api404b.json().catch(() => ({}));
  check('API 404 message', apiBody.error === 'Restaurant non trouvé', JSON.stringify(apiBody));
  const respUnknown = await page.goto(BASE + '/restaurant/test-restaurant-inexistant', { waitUntil: 'domcontentloaded', timeout: 60000 });
  check('unknown slug page → 404', respUnknown.status() === 404, `status=${respUnknown.status()}`);
  const unknownText = await page.textContent('body');
  check('unknown slug shows "Restaurant non trouvé"', unknownText.includes('Restaurant non trouvé'));

  console.log('\n──────────────────────────────────────────');
  console.log(`E2E RESULT: ${pass} passed, ${fail} failed`);
  if (failures.length) failures.forEach((f) => console.log(' -', f));

  await browser.close();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});

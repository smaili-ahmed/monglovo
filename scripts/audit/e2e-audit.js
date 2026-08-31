// OUJDA FOOD — AUDIT FINAL E2E (Playwright)
// Compares every rendered page against MongoDB truth exposed by the API.
// Usage: node scripts/audit/e2e-audit.js [baseUrl]
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:3000';
let pass = 0;
let fail = 0;
const failures = [];

function check(label, cond, extra = '') {
  if (cond) {
    pass++;
  } else {
    fail++;
    const line = `${label} ${extra}`.trim();
    failures.push(line);
    console.log('FAIL:', line);
  }
}

function parseMAD(text) {
  const m = String(text).match(/([\d]+[.,]?[\d]*)/);
  return m ? parseFloat(m[1].replace(',', '.')) : NaN;
}

// Extract rendered categories/products from a restaurant page.
function extractDom() {
  return Array.from(document.querySelectorAll('main section[id]')).map((s) => ({
    name: s.querySelector('h2')?.textContent.trim() ?? '',
    products: Array.from(s.querySelectorAll('article')).map((a) => ({
      name: a.querySelector('h3')?.textContent.trim() ?? '',
      desc: a.querySelector('p')?.textContent.trim() ?? '',
      price: parseFloat((a.querySelector('strong')?.textContent || '').replace(',', '.')),
      oldText: a.querySelector('del')?.textContent.trim() ?? null,
      discText:
        Array.from(a.querySelectorAll('span')).find((el) => /^-\d+%$/.test(el.textContent.trim()))?.textContent.trim() ??
        null,
      img: a.querySelector('img')?.getAttribute('src') ?? null,
    })),
  }));
}

async function auditRestaurantPage(page, slug, api) {
  const resp = await page.goto(`${BASE}/restaurant/${slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  check(`[${slug}] HTTP 200`, resp.status() === 200, `got ${resp.status()}`);
  await page.waitForTimeout(350);

  // no fake image sources anywhere on the page
  const badImgs = await page.$$eval('img', (imgs) =>
    imgs.map((i) => i.getAttribute('src') || '').filter((s) => /unsplash|placehold\.co|picsum|via\.placeholder|fake/i.test(s))
  );
  check(`[${slug}] no foreign/generic images`, badImgs.length === 0, JSON.stringify(badImgs.slice(0, 3)));

  const h1 = ((await page.locator('h1').first().textContent().catch(() => '')) || '').trim();
  check(`[${slug}] H1 == restaurant name`, h1 === api.name, `h1="${h1}"`);

  const domCats = await page.evaluate(extractDom);

  // categories: exact same multiset of names
  const domCatNames = domCats.map((c) => c.name).sort();
  const dbCatNames = api.categories.map((c) => c.name).sort();
  check(`[${slug}] category names == MongoDB`, JSON.stringify(domCatNames) === JSON.stringify(dbCatNames));
  const dupDom = domCatNames.filter((n, i) => domCatNames.indexOf(n) !== i);
  check(`[${slug}] no duplicated categories`, dupDom.length === 0, JSON.stringify([...new Set(dupDom)]));

  // products per category
  let domProducts = 0;
  for (const dc of domCats) {
    const cat = api.categories.find((c) => c.name === dc.name);
    if (!cat) continue;
    const domNames = dc.products.map((p) => p.name).sort();
    const dbNames = cat.products.map((p) => p.name).sort();
    check(`[${slug}][${dc.name}] product names == MongoDB`, JSON.stringify(domNames) === JSON.stringify(dbNames));
    domProducts += dc.products.length;
    for (const dp of dc.products) {
      const bp = cat.products.find((x) => x.name === dp.name);
      if (!bp) continue;
      check(
        `[${slug}][${dp.name}] price`,
        Math.abs(dp.price - bp.price) < 0.005,
        `dom=${dp.price} db=${bp.price}`
      );
      if (bp.oldPrice != null) {
        check(`[${slug}][${dp.name}] oldPrice`, dp.oldText !== null && Math.abs(parseMAD(dp.oldText) - bp.oldPrice) < 0.005, `dom=${dp.oldText} db=${bp.oldPrice}`);
      } else {
        check(`[${slug}][${dp.name}] no fake oldPrice`, dp.oldText === null, dp.oldText ?? '');
      }
      if (bp.discount != null) {
        check(`[${slug}][${dp.name}] discount badge`, dp.discText === `-${Math.round(bp.discount)}%`, `dom=${dp.discText} db=-${Math.round(bp.discount)}%`);
      }
      if (bp.image) {
        check(`[${slug}][${dp.name}] image == DB path`, dp.img === bp.image, `dom=${dp.img}`);
      } else {
        check(`[${slug}][${dp.name}] placeholder allowed only without DB image`, !!dp.img && dp.img.includes('placeholder'), dp.img ?? 'no src');
      }
    }
  }
  check(`[${slug}] total products displayed == MongoDB`, domProducts === api.categories.reduce((n, c) => n + c.products.length, 0), `dom=${domProducts}`);

  // broken local images
  const broken = await page.$$eval('article img', (imgs) =>
    imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'))
  );
  check(`[${slug}] no broken product images`, broken.length === 0, JSON.stringify(broken.slice(0, 3)));
}

async function cartFlowTest(page, slug) {
  await page.goto(`${BASE}/restaurant/${slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(400);

  const firstArticle = page.locator('article').first();
  const prodName = (await firstArticle.locator('h3').textContent()).trim();
  const prodPrice = parseMAD(await firstArticle.locator('strong').first().textContent());

  await firstArticle.locator('button[aria-label^="Ajouter"]').click();
  await page.waitForTimeout(300);
  let body = await page.textContent('body');
  check('[cart] item appears', body.includes(prodName) && body.includes('Subtotal'));

  const subAfterAdd = parseMAD(body.match(/Subtotal\s*\n?\s*([\d.,]+)/i)?.[1] ?? '');
  check('[cart] subtotal == price ×1', Math.abs(subAfterAdd - prodPrice) < 0.01, `sub=${subAfterAdd} price=${prodPrice}`);

  await firstArticle.locator('button[aria-label="Increase"], button[aria-label^="Ajouter"]').last().click();
  await page.waitForTimeout(300);
  body = await page.textContent('body');
  const subAfterInc = parseMAD(body.match(/Subtotal\s*\n?\s*([\d.,]+)/i)?.[1] ?? '');
  check('[cart] qty+ doubles subtotal', Math.abs(subAfterInc - prodPrice * 2) < 0.01, `sub=${subAfterInc}`);

  await page.locator('button[aria-label="Decrease"]').first().click();
  await page.waitForTimeout(300);
  body = await page.textContent('body');
  const subAfterDec = parseMAD(body.match(/Subtotal\s*\n?\s*([\d.,]+)/i)?.[1] ?? '');
  check('[cart] qty- restores subtotal', Math.abs(subAfterDec - prodPrice) < 0.01, `sub=${subAfterDec}`);

  await page.locator('button[aria-label="Decrease"]').first().click();
  await page.waitForTimeout(300);
  body = await page.textContent('body');
  check('[cart] empty state after removal', body.includes('Your order is empty'));

  // product modal
  await firstArticle.locator('button').first().click();
  await page.waitForTimeout(400);
  body = await page.textContent('body');
  const modalTitle = ((await page.locator('div.fixed h2').last().textContent().catch(() => '')) || '').trim();
  check('[modal] opens with product name', modalTitle === prodName, `title="${modalTitle}"`);
  check('[modal] shows price', body.includes(`${prodPrice.toFixed(2)} MAD`));
  await page.locator('div.fixed button[aria-label="Close"], div.fixed svg.lucide-x').first().click().catch(() => {});
}

async function responsiveTest(page, slug) {
  for (const [w, h] of [[1440, 900], [1280, 720], [960, 535], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/restaurant/${slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`[responsive ${w}x${h}] no horizontal overflow`, overflow <= 1, `overflow=${overflow}px`);
    const headerVisible = await page.locator('header').isVisible();
    check(`[responsive ${w}x${h}] header visible`, headerVisible);
    const articles = await page.locator('article').count();
    check(`[responsive ${w}x${h}] products rendered`, articles > 0, `articles=${articles}`);
  }
  await page.setViewportSize({ width: 1366, height: 900 });
}

async function main() {
  const apiAll = await (await fetch(`${BASE}/api/restaurants`)).json();
  check('API list count == 70', apiAll.count === 70, `count=${apiAll.count}`);
  const details = {};
  for (const r of apiAll.restaurants) {
    const resp = await fetch(`${BASE}/api/restaurants/${r.slug}`);
    details[r.slug] = { status: resp.status, json: resp.status === 200 ? await resp.json() : null };
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  const dataMissing = apiAll.restaurants.filter((r) => r.dataMissing).map((r) => r.slug);
  const withMenu = apiAll.restaurants.filter((r) => !r.dataMissing).map((r) => r.slug);

  // ---------- all restaurant pages vs MongoDB ----------
  for (const slug of withMenu) {
    await auditRestaurantPage(page, slug, details[slug].json);
  }

  // ---------- dataMissing pages ----------
  for (const slug of dataMissing) {
    const resp = await page.goto(`${BASE}/restaurant/${slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    check(`[${slug}] dataMissing HTTP 200`, resp.status() === 200, `got ${resp.status()}`);
    const text = await page.textContent('body');
    check(`[${slug}] unavailable message`, text.includes("n'est pas disponible"));
    const articles = await page.locator('article').count();
    check(`[${slug}] zero fake products`, articles === 0, `articles=${articles}`);
    const badImgs = await page.$$eval('img', (imgs) => imgs.map((i) => i.src).filter((s) => /unsplash/i.test(s)));
    check(`[${slug}] no unsplash`, badImgs.length === 0);
  }

  // ---------- cart flow + modal (McDonald's) ----------
  await cartFlowTest(page, 'mcdonaldsr-ojd-ojd');

  // ---------- responsive selected stores ----------
  await responsiveTest(page, 'mcdonaldsr-ojd-ojd');
  await responsiveTest(page, 'nijiri-house');       // biggest menu (158 products)
  await responsiveTest(page, 'inyas-food-ojd');     // smallest menu (9 products)
  await responsiveTest(page, 'pizza-hut-ojd1');     // has products without image

  // ---------- invalid routes ----------
  for (const bad of ['test-inexistant', 'abc123', 'fake']) {
    const resp = await page.goto(`${BASE}/restaurant/${bad}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    check(`/restaurant/${bad} → 404`, resp.status() === 404, `got ${resp.status()}`);
    const text = await page.textContent('body');
    check(`/restaurant/${bad} message`, text.includes('Restaurant non trouvé'));
    const articles = await page.locator('article').count();
    check(`/restaurant/${bad} no fake products`, articles === 0);
    const apiResp = await page.request.get(`${BASE}/api/restaurants/${bad}`);
    check(`/api/restaurants/${bad} → 404`, apiResp.status() === 404);
  }

  // ---------- home page vs MongoDB ----------
  const homeResp = await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  check('home HTTP 200', homeResp.status() === 200);
  await page.waitForTimeout(600);
  const cards = await page.$$eval('a[href^="/restaurant/"]', (as) =>
    as.map((a) => ({ href: a.getAttribute('href'), name: a.querySelector('h3')?.textContent.trim() ?? '' }))
  );
  check('home shows all 70 restaurants', cards.length === 70, `cards=${cards.length}`);
  const dbBySlug = Object.fromEntries(apiAll.restaurants.map((r) => [r.slug, r]));
  let badLinks = 0;
  let badNames = 0;
  let unsplashInCards = 0;
  for (const c of cards) {
    const slug = (c.href || '').replace('/restaurant/', '');
    if (!dbBySlug[slug]) badLinks++;
    else if (c.name !== dbBySlug[slug].name) badNames++;
    if (/unsplash/.test(c.href || '')) unsplashInCards++;
  }
  check('home links use real slugs', badLinks === 0, `bad=${badLinks}`);
  check('home names match MongoDB', badNames === 0, `bad=${badNames}`);
  const cardImgs = await page.$$eval('a[href^="/restaurant/"] img', (imgs) => imgs.map((i) => i.src));
  check('home card images not unsplash/fake', cardImgs.every((s) => !/unsplash|picsum/i.test(s)), `${cardImgs.length} imgs`);

  // search
  await page.fill('input[aria-label="Rechercher un restaurant"]', 'McDonald');
  await page.waitForTimeout(400);
  const searchCards = await page.$$eval('a[href^="/restaurant/"]', (as) => as.map((a) => a.getAttribute('href')));
  check('search finds McDonald', searchCards.length >= 1 && searchCards.every((h) => h.toLowerCase().includes('mcdonald')), JSON.stringify(searchCards));
  check('search filters others out', searchCards.length < 70);
  await page.fill('input[aria-label="Rechercher un restaurant"]', '');

  // category filters (FR labels → EN cuisines in DB)
  for (const [label, cuisine] of [['Pizza', 'Pizza'], ['Poulet', 'Chicken'], ['Sushi', 'Sushi'], ['Américain', 'American'], ['Tacos', 'Tacos']]) {
    await page.getByRole('button', { name: label, exact: true }).first().click();
    await page.waitForTimeout(400);
    const filteredHrefs = await page.$$eval('a[href^="/restaurant/"]', (as) => as.map((a) => a.getAttribute('href')));
    check(`filter "${label}" non-empty`, filteredHrefs.length > 0);
    const ok = filteredHrefs.every((h) => {
      const r = dbBySlug[h.replace('/restaurant/', '')];
      return r && r.cuisines.includes(cuisine);
    });
    check(`filter "${label}" matches cuisines ${cuisine}`, ok);
    await page.getByRole('button', { name: label, exact: true }).first().click(); // toggle back
    await page.waitForTimeout(250);
  }

  // ---------- /restaurants page ----------
  const restResp = await page.goto(BASE + '/restaurants', { waitUntil: 'domcontentloaded', timeout: 60000 });
  check('/restaurants HTTP 200', restResp.status() === 200);
  await page.waitForTimeout(500);
  const restCards = await page.locator('a[href^="/restaurant/"]').count();
  check('/restaurants shows all restaurants', restCards === 70, `cards=${restCards}`);

  console.log('\n══════════════════════════════════════════');
  console.log(`E2E AUDIT RESULT: ${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('--- FAILURES ---');
    failures.forEach((f) => console.log(' -', f));
  }

  await browser.close();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});

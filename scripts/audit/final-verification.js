// OUJDA FOOD — FINAL VERIFICATION E2E
// Read-only verification of the existing project against MongoDB (via API).
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

function parseMAD(t) {
  const m = String(t).match(/([\d]+[.,]?[\d]*)/);
  return m ? parseFloat(m[1].replace(',', '.')) : NaN;
}

function norm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function main() {
  const apiAll = await (await fetch(`${BASE}/api/restaurants`)).json();
  check('API list count == 70', apiAll.count === 70, `got ${apiAll.count}`);
  const dbBySlug = Object.fromEntries(apiAll.restaurants.map((r) => [r.slug, r]));

  // DB truth for detail pages
  const detail = {};
  for (const r of apiAll.restaurants) {
    const resp = await fetch(`${BASE}/api/restaurants/${r.slug}`);
    detail[r.slug] = resp.status === 200 ? await resp.json() : null;
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  // ---------- Phase A: all 70 routes ----------
  for (const r of apiAll.restaurants) {
    const resp = await page.goto(`${BASE}/restaurant/${r.slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (r.dataMissing) {
      check(`[route] ${r.slug} dataMissing → 200`, resp.status() === 200);
      continue;
    }
    check(`[route] ${r.slug} → 200`, resp.status() === 200, `got ${resp.status()}`);
    await page.waitForTimeout(250);
    const h1 = ((await page.locator('h1').first().textContent().catch(() => '')) || '').trim();
    check(`[route] ${r.slug} H1 == name`, h1 === r.name, `h1="${h1}"`);
    const d = detail[r.slug];
    const sections = await page.locator('main section[id]').count();
    check(`[route] ${r.slug} sections == DB categories`, sections === d.categories.length, `dom=${sections} db=${d.categories.length}`);
    const articles = await page.locator('article').count();
    check(`[route] ${r.slug} articles == DB products`, articles === d.categories.reduce((n, c) => n + c.products.length, 0), `dom=${articles}`);
  }

  // ---------- Phase B: detailed named restaurants ----------
  const wanted = ['McDonald', 'Nigiri House', 'C-TACOS', 'Pizza Hut', 'Pelle a Pizza', 'Y N N Ice Fast Food', 'Brimo', 'Nara Sushi', 'Hole Mole'];
  const picked = [];
  for (const w of wanted) {
    const found = apiAll.restaurants.find((r) => norm(r.name).includes(norm(w)));
    if (found) picked.push(found);
    else check(`[named] resolve "${w}"`, false, 'not found in DB');
  }
  console.log('Named restaurants:', picked.map((p) => `${p.name} (${p.slug})`).join(' | '));

  for (const r of picked) {
    const d = detail[r.slug];
    await page.goto(`${BASE}/restaurant/${r.slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(400);

    // hero image == DB image, local, loads
    const heroSrc = await page.locator('section img').first().getAttribute('src');
    check(`[${r.slug}] hero image == DB`, heroSrc === d.image, `dom=${heroSrc} db=${d.image}`);
    check(`[${r.slug}] hero image local`, heroSrc.startsWith('/restaurants/'), heroSrc);
    const heroOk = await page.locator('section img').first().evaluate((i) => i.complete && i.naturalWidth > 0);
    check(`[${r.slug}] hero image loads`, heroOk);

    // rating/reviews from DB or safe fallback
    const bodyText = await page.textContent('body');
    check(`[${r.slug}] rating displayed`, bodyText.includes(d.rating));

    // exact category names rendered
    const domCats = await page.$$eval('main section[id] h2', (els) => els.map((e) => e.textContent.trim()));
    check(`[${r.slug}] category names exact`, JSON.stringify(domCats) === JSON.stringify(d.categories.map((c) => c.name)));

    // sample first product of every 3rd category: price/oldPrice/discount/image vs DB
    let sampled = 0;
    for (let ci = 0; ci < d.categories.length; ci += 3) {
      const cat = d.categories[ci];
      const bp = cat.products[0];
      // mirror the component's id generation exactly: lowercase + spaces -> '-'
      const secId = cat.name.toLowerCase().replaceAll(' ', '-');
      const section = page.locator(`section[id="${secId}"]`);
      if ((await section.count()) === 0) {
        check(`[${r.slug}] section exists for "${cat.name}"`, false, `#/${secId}`);
        continue;
      }
      const article = section.locator('article').first();
      const artName = ((await article.locator('h3').textContent().catch(() => '')) || '').trim();
      check(`[${r.slug}] product name matches`, artName === bp.name, `dom="${artName}"`);
      const price = parseMAD(await article.locator('strong').first().textContent());
      check(`[${r.slug}] ${bp.name} price`, Math.abs(price - bp.price) < 0.005, `dom=${price} db=${bp.price}`);
      const del = await article.locator('del').count();
      check(`[${r.slug}] ${bp.name} oldPrice consistency`, bp.oldPrice != null ? del === 1 : del === 0);
      if (bp.discount != null) {
        const badge = await article.locator('span').evaluateAll((spans) =>
          spans.map((s) => s.textContent.trim()).find((t) => /^-\d+%$/.test(t))
        );
        check(`[${r.slug}] ${bp.name} discount badge`, badge === `-${Math.round(bp.discount)}%`, `dom=${badge}`);
      }
      const imgSrc = await article.locator('img').getAttribute('src');
      check(`[${r.slug}] ${bp.name} image == DB`, imgSrc === (bp.image || '/placeholder.svg'), imgSrc ?? 'none');
      const loads = await article.locator('img').evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false);
      check(`[${r.slug}] ${bp.name} image loads`, loads);
      sampled++;
    }
    check(`[${r.slug}] sampled categories`, sampled >= Math.ceil(d.categories.length / 3));

    // promo product exists somewhere if any oldPrice in menu
    const hasPromo = d.categories.some((c) => c.products.some((p) => p.oldPrice != null));
    const hasBadge = await page.locator('article span').evaluateAll((spans) =>
      spans.some((s) => /^-\d+%$/.test(s.textContent.trim()))
    );
    check(`[${r.slug}] promotions consistent`, hasPromo ? hasBadge : true, `hasPromo=${hasPromo}`);

    // ---------- modal + cart on this restaurant ----------
    const firstArticle = page.locator('article').first();
    const prodName = ((await firstArticle.locator('h3').textContent()) || '').trim();
    const prodPrice = parseMAD(await firstArticle.locator('strong').first().textContent());

    // modal opens with the exact product
    await firstArticle.locator('button').first().click();
    await page.waitForTimeout(350);
    const modalTitle = (((await page.locator('div.fixed h2').last().textContent().catch(() => '')) || '')).trim();
    check(`[${r.slug}] modal title == product`, modalTitle === prodName, `title="${modalTitle}"`);
    const modalBody = await page.textContent('body');
    check(`[${r.slug}] modal price`, modalBody.includes(`${prodPrice.toFixed(2)} MAD`));
    await page.locator('div.fixed button[aria-label="Close"]').first().click();
    await page.waitForTimeout(250);

    // + adds exactly the MongoDB product
    await firstArticle.locator('button[aria-label^="Ajouter"]').click();
    await page.waitForTimeout(300);
    let body = await page.textContent('body');
    check(`[${r.slug}] cart shows product`, body.includes(prodName));
    const sub1 = parseMAD(body.match(/Subtotal\s*\n?\s*([\d.,]+)/i)?.[1] ?? '');
    check(`[${r.slug}] subtotal == price`, Math.abs(sub1 - prodPrice) < 0.01, `sub=${sub1} price=${prodPrice}`);
    check(`[${r.slug}] delivery fee Indisponible (not invented)`, /Delivery fee\s*Indisponible/i.test(body.replace(/\n/g, ' ').replace(/\s+/g, ' ')));
    const total1 = parseMAD(body.match(/Total\s*\n?\s*([\d.,]+)/i)?.[1] ?? '');
    check(`[${r.slug}] total == subtotal (fee null)`, Math.abs(total1 - sub1) < 0.01);

    // + again, then -, then remove
    await firstArticle.locator('button[aria-label="Increase"], button[aria-label^="Ajouter"]').last().click();
    await page.waitForTimeout(300);
    body = await page.textContent('body');
    const sub2 = parseMAD(body.match(/Subtotal\s*\n?\s*([\d.,]+)/i)?.[1] ?? '');
    check(`[${r.slug}] qty+ doubles`, Math.abs(sub2 - prodPrice * 2) < 0.01);
    await page.locator('button[aria-label="Decrease"]').first().click();
    await page.waitForTimeout(200);
    await page.locator('button[aria-label="Decrease"]').first().click();
    await page.waitForTimeout(300);
    body = await page.textContent('body');
    check(`[${r.slug}] empty after removal`, body.includes('Your order is empty'));
  }

  // ---------- Phase C: search ×5 ----------
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(500);
  for (const term of ['McDonald', 'Pizza', 'Sushi', 'Tacos', 'Chicken']) {
    await page.fill('input[aria-label="Rechercher un restaurant"]', term);
    await page.waitForTimeout(400);
    const hrefs = await page.$$eval('a[href^="/restaurant/"]', (as) => as.map((a) => a.getAttribute('href')));
    const expected = apiAll.restaurants.filter((r) => r.name.toLowerCase().includes(term.toLowerCase())).map((r) => `/restaurant/${r.slug}`).sort();
    check(`[search] "${term}" count == MongoDB`, hrefs.sort().join('|') === expected.join('|'), `dom=${hrefs.length} db=${expected.length}`);
  }
  await page.fill('input[aria-label="Rechercher un restaurant"]', '');

  // ---------- Phase D: filters vs MongoDB counts ----------
  const aliases = {
    Burgers: 'Burgers', Américain: 'American', Sandwichs: 'Sandwich', International: 'International',
    Pizza: 'Pizza', Tacos: 'Tacos', Italien: 'Italian', Grillades: 'Grill', Chawarma: 'Shawarma',
    Poulet: 'Chicken', Asiatique: 'Asian', Sushi: 'Sushi', Marocain: 'Moroccan', Oriental: 'Oriental', Sucré: 'Sweets',
  };
  for (const label of ['Pizza', 'Burgers', 'Sushi', 'Tacos', 'Poulet', 'Américain', 'Sandwichs', 'Asiatique']) {
    await page.getByRole('button', { name: label, exact: true }).first().click();
    await page.waitForTimeout(400);
    const hrefs = await page.$$eval('a[href^="/restaurant/"]', (as) => as.map((a) => a.getAttribute('href')));
    const cuisine = aliases[label];
    const expected = apiAll.restaurants.filter((r) => (r.cuisines || []).includes(cuisine)).map((r) => `/restaurant/${r.slug}`).sort();
    check(`[filter] "${label}" count == MongoDB (${expected.length})`, hrefs.sort().join('|') === expected.join('|'), `dom=${hrefs.length}`);
    await page.getByRole('button', { name: label, exact: true }).first().click(); // untoggle
    await page.waitForTimeout(250);
  }

  // ---------- Phase E: responsive ----------
  for (const slug of ['mcdonaldsr-ojd-ojd', 'nijiri-house', 'hole-mole-ojd']) {
    for (const [w, h] of [[1440, 900], [1280, 720], [960, 535], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${BASE}/restaurant/${slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`[resp ${w}x${h}] ${slug} no overflow`, overflow <= 1, `${overflow}px`);
      check(`[resp ${w}x${h}] ${slug} header visible`, await page.locator('header').isVisible());
      const arts = await page.locator('article').count();
      check(`[resp ${w}x${h}] ${slug} products visible`, arts > 0, `arts=${arts}`);
      // all category tabs present & clickable at this size
      const tabs = await page.locator('button:has-text("' + (await page.locator('main section[id] h2').first().textContent()) + '")').count();
      check(`[resp ${w}x${h}] ${slug} first category reachable`, tabs >= 1);
    }
  }
  // mobile cart panel opens
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/restaurant/mcdonaldsr-ojd-ojd`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(400);
  await page.locator('article button[aria-label^="Ajouter"]').first().click();
  await page.locator('header button[aria-label="Open cart"]').click();
  await page.waitForTimeout(300);
  const mobileCart = await page.textContent('body');
  check('[resp mobile] cart panel opens with item', mobileCart.includes('Subtotal'));
  await page.setViewportSize({ width: 1366, height: 900 });

  // ---------- Phase F: invalid routes ----------
  for (const bad of ['test-inexistant', 'abc123', 'fake']) {
    const resp = await page.goto(`${BASE}/restaurant/${bad}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    check(`[404] /restaurant/${bad}`, resp.status() === 404 && (await page.textContent('body')).includes('Restaurant non trouvé'));
    const apiResp = await page.request.get(`${BASE}/api/restaurants/${bad}`);
    check(`[404] API /${bad}`, apiResp.status() === 404);
  }

  // ---------- home & /restaurants sanity ----------
  const homeResp = await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  check('[home] 200', homeResp.status() === 200);
  check('[home] 70 cards', (await page.locator('a[href^="/restaurant/"]').count()) === 70);
  const restResp = await page.goto(BASE + '/restaurants', { waitUntil: 'domcontentloaded', timeout: 60000 });
  check('[/restaurants] 200', restResp.status() === 200);
  await page.waitForTimeout(400);
  check('[/restaurants] 70 cards', (await page.locator('a[href^="/restaurant/"]').count()) === 70);

  console.log('\n════════════════════════════════════');
  console.log(`FINAL VERIFICATION: ${pass} passed, ${fail} failed`);
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

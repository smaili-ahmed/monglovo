const fs = require('fs');
const path = require('path');
const config = require('./config');
const utils = require('./utils');
const storage = require('./storage');
const browserMod = require('./browser');
const extractor = require('./glovo-extractor');
const products = require('./glovo-products');
const imageHandler = require('./image-handler');

function parseArgs(argv) {
  const args = { city: config.DEFAULT_CITY, dryRun: false, limit: 0, only: null, force: false, noImages: false };
  for (const arg of argv.slice(2)) {
    const m = arg.match(/^--([a-z-]+)(?:=(.*))?$/i);
    if (!m) continue;
    const [, key, value] = m;
    switch (key.toLowerCase()) {
      case 'city': args.city = value || config.DEFAULT_CITY; break;
      case 'dry-run': args.dryRun = true; break;
      case 'limit': args.limit = parseInt(value || '0', 10); break;
      case 'only': args.only = (value || '').split(',').map((s) => s.trim()).filter(Boolean); break;
      case 'force': args.force = true; break;
      case 'no-images': args.noImages = true; break;
    }
  }
  return args;
}

function buildStoreData(target, parsed) {
  const categories = (parsed.categories || []).map((c) => ({ name: c.name, products: c.products }));
  return {
    slug: target.slug,
    name: parsed.store?.name || target.name,
    glovoUrl: target.url,
    rating: parsed.store?.rating || target.rating || null,
    reviews: target.reviews || null,
    cuisines: parsed.store?.cuisines || [],
    image: target.image || parsed.logoUrl || null,
    logoUrl: parsed.logoUrl || null,
    promotion: null,
    open: parsed.store?.open ?? null,
    dataMissing: categories.length === 0,
    categories,
    glovoStoreId: parsed.store?.glovoId || null,
    scrapedAt: new Date().toISOString(),
  };
}

async function fetchStoreHtml(context, url) {
  const resp = await context.request.get(url, {
    headers: { 'User-Agent': config.USER_AGENT, Accept: 'text/html' },
    timeout: config.NAV_TIMEOUT,
  });
  if (!resp.ok()) throw new Error(`HTTP ${resp.status()} for ${url}`);
  return resp.text();
}

async function main() {
  const args = parseArgs(process.argv);
  storage.ensureDirs();

  console.log('══════════════════════════════════════════');
  console.log(`GLOVO SCRAPER — city="${args.city}"${args.dryRun ? ' — DRY RUN (nothing written)' : ''}`);
  console.log('══════════════════════════════════════════');

  const { browser, context } = await browserMod.launch();

  try {
    // ---------- 1. Listing ----------
    let index = storage.loadIndex();
    if (!index || index.city !== args.city || !args.only) {
      utils.log('run', 'scraping listing page…');
      const page = await browserMod.newPage(context);
      const restaurants = await utils.retry(() => extractor.scrapeListing(page, args.city), 2);
      await page.close().catch(() => {});
      index = { city: args.city, restaurants };
      if (!args.dryRun) storage.saveIndex(restaurants, args.city);
    } else {
      utils.log('run', `using cached listing (${index.restaurants.length} restaurants)`);
    }

    let targets = index.restaurants;
    if (args.only && args.only.length) {
      targets = targets.filter((r) => args.only.includes(r.slug) || args.only.includes(r.name));
      utils.log('run', `--only filter: ${targets.length} match(es)`);
    }
    if (args.limit > 0) targets = targets.slice(0, args.limit);

    console.log(`\nRestaurants found: ${targets.length}\n`);

    // ---------- 2. Per-store scraping ----------
    const results = [];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const tag = `${i + 1}/${targets.length}`;
      try {
        if (!args.force && !args.dryRun) {
          const cached = storage.loadStore(target.slug);
          if (cached && !cached.dataMissing && Array.isArray(cached.categories)) {
            utils.log('run', `${tag} [cached] ${target.slug}`);
            results.push({ slug: target.slug, status: 'CACHED', ...countOf(cached) });
            continue;
          }
        }

        const html = await utils.retry(() => fetchStoreHtml(context, target.url), 3);
        const parsed = products.parseStorePage(html);

        if (!parsed.categories.length) {
          utils.log('run', `${tag} ${target.slug} → NO MENU accessible`);
          storage.appendError({
            level: 'warn',
            kind: 'NO_MENU',
            restaurant: target.name,
            slug: target.slug,
            url: target.url,
            error: 'menu inaccessible (empty RSC payload)',
          });
          results.push({ slug: target.slug, status: 'NO_MENU', categories: 0, products: 0 });
          await utils.sleep(config.PER_STORE_PAUSE_MS);
          continue;
        }

        const storeData = buildStoreData(target, parsed);

        if (!args.dryRun) {
          storage.saveStore(target.slug, storeData);
          if (!args.noImages) {
            await imageHandler.downloadStoreImages(storeData);
            storage.saveStore(target.slug, storeData);
          }
        }

        utils.log(
          'run',
          `${tag} ${target.slug} → SUCCESS categories=${storeData.categories.length} products=${countProducts(storeData)}${args.dryRun ? ' (dry-run)' : ''}`
        );
        results.push({ slug: target.slug, status: 'SUCCESS', ...countOf(storeData) });
        await utils.sleep(config.PER_STORE_PAUSE_MS);
      } catch (err) {
        utils.log('ERROR', `${tag} ${target.slug} failed: ${err.message.split('\n')[0]}`);
        storage.appendError({
          level: 'error',
          kind: 'SCRAPE_ERROR',
          restaurant: target.name,
          slug: target.slug,
          url: target.url,
          error: err.message.split('\n')[0],
        });
        results.push({ slug: target.slug, status: 'ERROR', categories: 0, products: 0 });
      }
    }

    // ---------- 3. Report ----------
    printSummary(targets.length, results, args);
  } finally {
    await browserMod.closeAll({ browser });
  }
}

function countProducts(store) {
  return store.categories.reduce((n, c) => n + (c.products?.length || 0), 0);
}
function countOf(store) {
  return { categories: store.categories.length, products: countProducts(store) };
}

function printSummary(total, results, args) {
  console.log('\n──────────────────────────────────────────');
  console.log('SCRAPER SUMMARY (per restaurant)');
  console.log('──────────────────────────────────────────');
  for (const r of results) {
    console.log(
      `${r.status.padEnd(9)} ${r.slug.padEnd(42)} categories=${String(r.categories).padStart(3)} products=${String(r.products).padStart(4)}`
    );
  }
  const success = results.filter((r) => r.status === 'SUCCESS').length;
  const cached = results.filter((r) => r.status === 'CACHED').length;
  const noMenu = results.filter((r) => r.status === 'NO_MENU').length;
  const errors = results.filter((r) => r.status === 'ERROR').length;

  fs.mkdirSync(config.DATA_DIR, { recursive: true });
  const reportPath = path.join(config.DATA_DIR, args.dryRun ? 'scrape-report-dry-run.json' : 'scrape-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ city: args.city, dryRun: args.dryRun, results }, null, 2));

  console.log('──────────────────────────────────────────');
  console.log(`Restaurants found : ${total}`);
  console.log(`Success           : ${success}`);
  console.log(`Cached (skipped)  : ${cached}`);
  console.log(`No menu           : ${noMenu}`);
  console.log(`Errors            : ${errors}`);
  console.log(`Report            : ${reportPath}`);
  if (args.dryRun) console.log('DRY RUN: nothing was written.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

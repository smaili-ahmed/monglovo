const config = require('./config');
const { dismissConsent } = require('./browser');
const { slugify, log } = require('./utils');

// Extract every store card from a Glovo listing page.
// Cards are anchors with data-testid="store-card". The wall lazy-loads while
// scrolling, so we scroll until the card count stabilizes.
async function scrapeListing(page, city) {
  const url = config.listingUrl(city);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.NAV_TIMEOUT });
  await dismissConsent(page);
  await page.waitForFunction(
    () => document.querySelectorAll('a[data-testid="store-card"]').length > 0,
    { timeout: 30000 }
  );

  let stableRounds = 0;
  let lastCount = 0;
  for (let i = 0; i < config.MAX_SCROLL_STEPS && stableRounds < config.STABLE_ROUNDS; i++) {
    await page.evaluate(() => window.scrollBy(0, 900));
    await page.waitForTimeout(config.SCROLL_DELAY);
    const count = await page.evaluate(
      () => document.querySelectorAll('a[data-testid="store-card"]').length
    );
    if (count === lastCount) stableRounds++;
    else {
      stableRounds = 0;
      lastCount = count;
    }
  }

  const restaurants = await page.evaluate(() => {
    const seen = new Map();
    document.querySelectorAll('a[data-testid="store-card"]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (!href.includes('/stores/')) return;
      const titleEl =
        a.querySelector('[class*="StoreCardStoreWall_title"]') || a.querySelector('p');
      const name = (titleEl ? titleEl.textContent : a.getAttribute('aria-label'))?.trim();
      if (!name) return;
      const img = a.querySelector('img[src*="stores-glovo/stores"]');
      const ratingImg = a.querySelector('img[alt*="%"]');
      const votesEl = a.querySelector('[class*="StoreRatings_votes"]');
      seen.set(href, {
        name,
        url: new URL(href, location.origin).toString(),
        image: img ? img.src : null,
        rating: ratingImg ? ratingImg.getAttribute('alt') : null,
        reviews: votesEl ? votesEl.textContent.trim().replace(/[()]/g, '') : null,
      });
    });
    return [...seen.values()];
  });

  const withSlugs = restaurants.map((r) => ({
    ...r,
    slug: slugify(new URL(r.url).pathname.split('/stores/')[1]),
  }));
  const unique = [...new Map(withSlugs.map((r) => [r.slug, r])).values()];
  log('listing', `found ${unique.length} restaurants on ${url}`);
  return unique;
}

module.exports = { scrapeListing };

function slugify(input) {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`´]/g, '')
    .replace(/&/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Stable product key: restaurant + category + name (+ price when provided)
function slugifyProduct(restaurantSlug, categoryName, productName) {
  return [slugify(restaurantSlug), slugify(categoryName), slugify(productName)]
    .filter(Boolean)
    .join('__');
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/\u00a0/g, ' ')
    .replace(/[^\d.,-]/g, ' ')
    .trim();
  if (!cleaned) return null;
  // Glovo formats: "105,00 MAD" or "105.00 MAD"
  let normalized = cleaned.replace(/\s+/g, '');
  if (/,\d{1,2}$/.test(normalized)) normalized = normalized.replace(',', '.');
  else normalized = normalized.replace(/,/g, '');
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseDiscountPercent(text) {
  if (!text) return null;
  const m = String(text).match(/(\d{1,2})\s*%/);
  return m ? parseInt(m[1], 10) : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, attempts = 3, baseDelayMs = 2000) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(baseDelayMs * (i + 1));
    }
  }
  throw lastErr;
}

function ts() {
  return new Date().toISOString();
}

function log(tag, msg) {
  console.log(`[${ts()}] [${tag}] ${msg}`);
}

module.exports = { slugify, slugifyProduct, parsePrice, parseDiscountPercent, sleep, retry, ts, log };

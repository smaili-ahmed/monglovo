// Parses the Next.js RSC flight payload embedded in Glovo store pages.
// The SSR payload contains the COMPLETE menu as structured JSON
// (STORE_MENU + LIST + PRODUCT_ROW entities), far more reliable than DOM scraping.
const { parsePrice } = require('./utils');

function joinNextF(html) {
  const re = /self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g;
  let joined = '';
  let m;
  while ((m = re.exec(html))) {
    try {
      joined += JSON.parse('"' + m[1] + '"');
    } catch {
      /* skip malformed chunk */
    }
  }
  return joined;
}

function extractBalancedObject(s, start) {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function findAllEntities(joined, marker) {
  const out = [];
  let idx = 0;
  while ((idx = joined.indexOf(marker, idx)) !== -1) {
    const objStart = joined.indexOf('{', idx + marker.length - 1);
    const raw = extractBalancedObject(joined, objStart);
    if (raw) {
      try {
        out.push(JSON.parse(raw));
      } catch {
        /* skip */
      }
    }
    idx += marker.length;
  }
  return out;
}

function dhImageUrl(imageId, width = 640) {
  if (!imageId) return null;
  const path = imageId.replace(/^dh:/, '');
  const t = Buffer.from(
    JSON.stringify([{ resize: { width, height: width } }, { webp: {} }])
  ).toString('base64');
  return `https://glovo.dhmedia.io/image/${path}?t=${t}`;
}

function firstStoreLogo(html) {
  // data-testid="store-logo" <img src=".../store_logos/...">
  const m =
    html.match(/data-testid="store-logo"[^>]*>[\s\S]{0,400}?src="([^"]+)"/) ||
    html.match(/(https:\/\/glovo\.dhmedia\.io\/image\/customer-assets-glovo\/store_logos\/[^"?]+)/);
  return m ? m[1] : null;
}

function parseAttributeGroups(elements) {
  if (!Array.isArray(elements)) return [];
  const optionGroups = [];
  let pos = 0;

  for (const el of elements) {
    if (el && el.type === 'ATTRIBUTES_GROUP' && el.data) {
      const d = el.data;
      const options = [];
      let optPos = 0;

      for (const attrEl of d.elements || []) {
        if (attrEl && attrEl.type === 'ATTRIBUTE' && attrEl.data) {
          const ad = attrEl.data;
          options.push({
            optionId: String(ad.attributeId || ad.id || optPos),
            name: (ad.name || '').trim(),
            price: typeof ad.price === 'number' ? ad.price : 0,
            available: ad.isEnabled !== false,
            position: optPos++,
          });
        }
      }

      optionGroups.push({
        groupId: String(d.attributeGroupId || d.groupId || pos),
        name: (d.title || '').trim(),
        description: (d.subtitle || '').trim(),
        required: !!(d.requiredText || (d.min && d.min > 0)),
        min: typeof d.min === 'number' ? d.min : 0,
        max: typeof d.max === 'number' ? d.max : 1,
        position: pos++,
        options,
      });
    }
  }

  return optionGroups;
}

function parseStorePage(html) {
  const joined = joinNextF(html);
  if (!joined) return { store: null, logoUrl: null, categories: [] };

  // ---- store entity ----
  let store = null;
  const sm = joined.match(/"store":\{"id":\d+,"name":"[^"]+"/);
  if (sm) {
    const objStart = joined.indexOf('{', sm.index + '"store":'.length - 1);
    const raw = extractBalancedObject(joined, objStart);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        store = {
          glovoId: s.id,
          name: s.name,
          slug: s.slug,
          rating: s.rating || null,
          open: !!s.open,
          cuisines: (s.filters || []).map((f) => f.displayName || f.name).filter(Boolean),
        };
      } catch {
        /* ignore */
      }
    }
  }

  const logoUrl = firstStoreLogo(html);

  // ---- menu lists (categories with products) ----
  const lists = findAllEntities(joined, '"type":"LIST","data":');
  const byTitle = new Map();

  const rowFromElement = (e) => {
    if (!e || e.type !== 'PRODUCT_ROW' || !e.data) return null;
    const r = e.data;
    const name = (r.name || '').trim();
    if (!name) return null;

    const basePrice = typeof r.price === 'number' ? r.price : parsePrice(r.priceInfo?.displayText);
    let price = basePrice;
    let oldPrice = null;
    let discount = null;
    const promo = (r.promotions || [])[0];
    if (promo && typeof promo.percentage === 'number') {
      discount = Math.round(promo.percentage);
      oldPrice = basePrice;
      if (typeof promo.price === 'number') price = promo.price;
    } else if (promo && promo.title) {
      const pm = String(promo.title).match(/(\d{1,2})\s*%/);
      if (pm) discount = parseInt(pm[1], 10);
      oldPrice = basePrice;
      if (typeof promo.price === 'number') price = promo.price;
    }

    const outOfStock = JSON.stringify(e.actions || '').includes('"isOutOfStock":"true"');
    const optionGroups = parseAttributeGroups(r.customizations || r.attributeGroups || e.elements || []);

    return {
      name,
      description: r.description ? r.description.trim() : null,
      price: price != null ? Math.round(price * 100) / 100 : null,
      oldPrice: oldPrice != null && oldPrice > (price ?? 0) ? Math.round(oldPrice * 100) / 100 : null,
      discount: discount && discount > 0 ? discount : null,
      image: dhImageUrl(r.imageId),
      available: !outOfStock,
      optionGroups,
    };
  };

  for (const list of lists) {
    const title = (list.title || '').trim();
    if (!title) continue;
    if (!byTitle.has(title)) byTitle.set(title, []);
    const bucket = byTitle.get(title);
    for (const e of list.elements || []) {
      const p = rowFromElement(e);
      if (p) bucket.push(p);
    }
  }

  // dedupe identical rows within a category
  for (const [, arr] of byTitle) {
    const seen = new Set();
    const kept = [];
    for (const p of arr) {
      const k = `${p.name}::${p.price}`;
      if (seen.has(k)) continue;
      seen.add(k);
      kept.push(p);
    }
    arr.length = 0;
    arr.push(...kept);
  }

  const categories = [...byTitle.entries()].map(([name, products]) => ({
    name,
    products,
  }));

  return { store, logoUrl, categories };
}

module.exports = { joinNextF, parseStorePage, dhImageUrl, parseAttributeGroups };


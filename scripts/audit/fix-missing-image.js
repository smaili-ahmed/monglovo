// One-off repair: complete a failed product-image download (real Glovo URL kept in DB).
// Usage: node scripts/audit/fix-missing-image.js <productSlug>
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const config = require('../scraper/config');
const { connectDB } = require('../../lib/db');
const Product = require('../../lib/models/Product');

async function main() {
  const targetSlug = process.argv[2];
  if (!targetSlug) throw new Error('usage: node fix-missing-image.js <productSlug>');

  const { connect } = await import('mongoose').then((m) => ({ connect: m.default.connect }));
  await connectDB();

  const prod = await Product.findOne({ slug: targetSlug }).lean();
  if (!prod) throw new Error('product not found: ' + targetSlug);
  if (!/^https?:/.test(prod.image || '')) {
    console.log('Nothing to fix — image is already local or null:', prod.image);
    return;
  }

  const restSlug = targetSlug.split('__')[0];
  const catSlug = targetSlug.split('__')[1];

  // find category name from scraped JSON to rebuild the exact same key
  const storePath = path.join(config.DATA_DIR, 'stores', `${restSlug}.json`);
  const storeData = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  const { slugifyProduct, slugify } = require('../scraper/utils');
  const cat = storeData.categories.find((c) => slugify(c.name) === catSlug);
  if (!cat) throw new Error('category not found in store JSON: ' + catSlug);
  const jsonProd = cat.products.find((p) => p.name === prod.name);

  const key = slugifyProduct(restSlug, cat.name, prod.name);
  const dir = path.join(config.IMAGES_ROOT, restSlug, 'products');
  fs.mkdirSync(dir, { recursive: true });

  const resp = await fetch(prod.image, {
    headers: { 'User-Agent': config.USER_AGENT, Referer: config.BASE_URL },
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`download failed: HTTP ${resp.status}`);
  const type = resp.headers.get('content-type') || '';
  const ext = type.includes('webp') ? 'webp' : type.includes('png') ? 'png' : 'jpg';
  const localRel = `/restaurants/${restSlug}/products/${key}.${ext}`;
  fs.writeFileSync(path.join('public', localRel.replace(/^\//, '')), Buffer.from(await resp.arrayBuffer()));

  // update DB
  await Product.updateOne({ slug: targetSlug }, { $set: { image: localRel } });

  // keep scraped JSON consistent with DB
  if (jsonProd) {
    jsonProd.image = localRel;
    fs.writeFileSync(storePath, JSON.stringify(storeData, null, 2));
  }

  console.log('FIXED:', targetSlug, '→', localRel);
  const mongoose = require('mongoose');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('FATAL:', e.message || e);
  process.exit(1);
});

// One-off: localize the remote Glovo covers of the 2 dataMissing restaurants.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const config = require('../scraper/config');
const { connectDB } = require('../../lib/db');
const Restaurant = require('../../lib/models/Restaurant');

async function downloadTo(url, baseName) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': config.USER_AGENT, Referer: config.BASE_URL },
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  const type = resp.headers.get('content-type') || '';
  const ext = type.includes('webp') ? 'webp' : type.includes('png') ? 'png' : 'jpg';
  const file = `${baseName}.${ext}`;
  fs.writeFileSync(file, Buffer.from(await resp.arrayBuffer()));
  return file;
}

async function main() {
  await connectDB();
  const targets = ['flourish-bubble-ojd', 'pause-a-paris-ojd'];
  for (const slug of targets) {
    const r = await Restaurant.findOne({ slug }).lean();
    if (!r) throw new Error('not found: ' + slug);
    if (!/^https?:/.test(r.image || '')) {
      console.log(slug, 'already local:', r.image);
      continue;
    }
    const dir = path.join(config.IMAGES_ROOT, slug);
    fs.mkdirSync(dir, { recursive: true });
    const file = await downloadTo(r.image, path.join(dir, 'cover'));
    const localRel = `/restaurants/${slug}/${path.basename(file)}`;
    await Restaurant.updateOne({ slug }, { $set: { image: localRel } });

    // keep scraped JSON consistent
    const storePath = path.join(config.STORES_DIR, `${slug}.json`);
    if (fs.existsSync(storePath)) {
      const s = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      s.image = localRel;
      fs.writeFileSync(storePath, JSON.stringify(s, null, 2));
    }
    console.log('FIXED', slug, '->', localRel);
  }
  const mongoose = require('mongoose');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});

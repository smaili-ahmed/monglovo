const fs = require('fs');
const path = require('path');
const config = require('./config');
const { slugifyProduct, log } = require('./utils');

async function downloadTo(url, baseName) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': config.USER_AGENT, Referer: config.BASE_URL },
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) return null;
    const type = resp.headers.get('content-type') || '';
    const ext = type.includes('webp') ? 'webp' : type.includes('png') ? 'png' : type.includes('gif') ? 'gif' : 'jpg';
    const buf = Buffer.from(await resp.arrayBuffer());
    const file = `${baseName}.${ext}`;
    fs.writeFileSync(file, buf);
    return file;
  } catch {
    return null;
  }
}

// Downloads store cover/logo + product images into
//   public/restaurants/<store-slug>/{cover.jpg, products/<key>.<ext>}
// and rewrites image fields to local paths. Only real Glovo image URLs are
// used; products without an image keep null.
async function downloadStoreImages(storeData) {
  const slug = storeData.slug;
  const dir = path.join(config.IMAGES_ROOT, slug);
  const prodDir = path.join(dir, 'products');
  fs.mkdirSync(prodDir, { recursive: true });

  let ok = 0;

  if (storeData.image && /^https?:/.test(storeData.image)) {
    const file = await downloadTo(storeData.image, path.join(dir, 'cover'));
    if (file) {
      storeData.image = `/restaurants/${slug}/${path.basename(file)}`;
      ok++;
    }
  }
  if (storeData.logoUrl && /^https?:/.test(storeData.logoUrl)) {
    const file = await downloadTo(storeData.logoUrl, path.join(dir, 'logo'));
    if (file) {
      storeData.logoUrl = `/restaurants/${slug}/${path.basename(file)}`;
      ok++;
    }
  }

  let withImage = 0;
  let withoutImage = 0;
  for (const cat of storeData.categories || []) {
    for (const p of cat.products || []) {
      if (!p.image || !/^https?:/.test(p.image)) {
        withoutImage++;
        continue;
      }
      const key = slugifyProduct(slug, cat.name, p.name);
      const file = await downloadTo(p.image, path.join(prodDir, key));
      if (!file) continue; // keep remote URL if download failed
      p.image = `/restaurants/${slug}/products/${path.basename(file)}`;
      withImage++;
    }
  }
  log('images', `[${slug}] downloaded: ${withImage} product images (+${ok} store), without image: ${withoutImage}`);
  return storeData;
}

module.exports = { downloadStoreImages };

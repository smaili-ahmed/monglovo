const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('../../lib/db');
const Restaurant = require('../../lib/models/Restaurant');
const Category = require('../../lib/models/Category');
const Product = require('../../lib/models/Product');
const { slugify } = require('../scraper/utils');

const STORES_DIR = path.resolve(__dirname, '..', '..', 'data', 'scraped', 'stores');

async function importStore(storeData) {
  const counts = { categories: 0, products: 0, skipped: 0 };

  // ---- restaurant upsert (never delete, never duplicate) ----
  const restaurant = await Restaurant.findOneAndUpdate(
    { slug: storeData.slug },
    {
      $set: {
        name: storeData.name,
        glovoUrl: storeData.glovoUrl || null,
        glovoStoreId: storeData.glovoStoreId || null,
        image: storeData.image || null,
        logoUrl: storeData.logoUrl || null,
        rating: storeData.rating || null,
        reviews: storeData.reviews || null,
        cuisines: storeData.cuisines || [],
        promotion: storeData.promotion || null,
        open: storeData.open ?? null,
        city: 'oujda',
        source: 'glovo',
        lastScrapedAt: storeData.scrapedAt ? new Date(storeData.scrapedAt) : new Date(),
      },
      $setOnInsert: { dataMissing: !!storeData.dataMissing },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (!storeData.categories?.length) {
    await Restaurant.updateOne({ _id: restaurant._id }, { $set: { dataMissing: true } });
    return counts;
  }
  await Restaurant.updateOne({ _id: restaurant._id }, { $set: { dataMissing: false } });

  let catPos = 0;
  for (const cat of storeData.categories) {
    if (!cat.name || !cat.products?.length) {
      counts.skipped++;
      continue;
    }
    const catSlug = slugify(cat.name);
    const category = await Category.findOneAndUpdate(
      { restaurantId: restaurant._id, slug: catSlug },
      { $set: { name: cat.name, position: catPos } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    counts.categories++;
    catPos++;

    let prodPos = 0;
    for (const p of cat.products) {
      const pSlug = [restaurant.slug, catSlug, slugify(p.name)].filter(Boolean).join('__');
      await Product.findOneAndUpdate(
        { restaurantId: restaurant._id, slug: pSlug },
        {
          $set: {
            categoryId: category._id,
            name: p.name,
            description: p.description ?? null,
            price: p.price ?? null,
            oldPrice: p.oldPrice ?? null,
            discount: p.discount ?? null,
            image: p.image ?? null,
            available: p.available !== false,
            position: prodPos,
            optionGroups: p.optionGroups || p.option_groups || [],
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      counts.products++;
      prodPos++;
    }
  }
  return counts;
}

async function main() {
  console.log('══════════════════════════════════════════');
  console.log('IMPORT — Glovo scrape → MongoDB (upsert)');
  console.log('══════════════════════════════════════════');
  await connectDB();

  const files = fs.readdirSync(STORES_DIR).filter((f) => f.endsWith('.json'));
  console.log(`Store files found: ${files.length}\n`);

  let totals = { restaurants: 0, categories: 0, products: 0, noMenu: 0 };
  for (const file of files) {
    const storeData = JSON.parse(fs.readFileSync(path.join(STORES_DIR, file), 'utf8'));
    try {
      const c = await importStore(storeData);
      totals.restaurants++;
      totals.categories += c.categories;
      totals.products += c.products;
      if (storeData.dataMissing) totals.noMenu++;
      console.log(
        `${(storeData.dataMissing ? 'NO_MENU ' : 'OK     ').padEnd(8)} ${storeData.slug.padEnd(42)} +${c.categories} cats / +${c.products} products`
      );
    } catch (err) {
      console.error(`ERROR   ${storeData.slug}: ${err.message}`);
    }
  }

  console.log('\n──────────────────────────────────────────');
  console.log(`Restaurants processed : ${totals.restaurants}`);
  console.log(`Categories upserted   : ${totals.categories}`);
  console.log(`Products upserted     : ${totals.products}`);
  console.log(`No-menu stores        : ${totals.noMenu}`);

  const mongoose = require('mongoose');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});

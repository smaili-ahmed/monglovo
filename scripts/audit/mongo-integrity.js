// READ-ONLY MongoDB integrity audit for OUJDA FOOD final report.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB } = require('../../lib/db');
const Restaurant = require('../../lib/models/Restaurant');
const Category = require('../../lib/models/Category');
const Product = require('../../lib/models/Product');

async function main() {
  await connectDB();

  const out = { restaurants: {}, categories: {}, products: {}, relations: {}, images: {} };

  // ---- Restaurants ----
  const rests = await Restaurant.find({}).lean();
  out.restaurants.total = rests.length;
  out.restaurants.noSlug = rests.filter((r) => !r.slug).length;
  const slugCounts = {};
  for (const r of rests) slugCounts[r.slug] = (slugCounts[r.slug] || 0) + 1;
  out.restaurants.duplicateSlugs = Object.entries(slugCounts).filter(([, n]) => n > 1);
  out.restaurants.dataMissing = rests.filter((r) => r.dataMissing).map((r) => r.slug);
  out.restaurants.withoutImage = rests.filter((r) => !r.image && !r.logoUrl).map((r) => r.slug);
  out.restaurants.withoutCuisines = rests.filter((r) => !r.cuisines || !r.cuisines.length).map((r) => r.slug);
  out.restaurants.openTrue = rests.filter((r) => r.open === true).length;
  out.restaurants.withRating = rests.filter((r) => !!r.rating).length;
  out.restaurants.withPromotion = rests.filter((r) => !!r.promotion).length;

  // ---- Categories ----
  const cats = await Category.find({}).lean();
  out.categories.total = cats.length;
  const restIds = new Set(rests.map((r) => String(r._id)));
  out.categories.orphan = cats.filter((c) => !restIds.has(String(c.restaurantId))).length;
  const catKeyCount = {};
  for (const c of cats) catKeyCount[`${c.restaurantId}|${c.slug}`] = (catKeyCount[`${c.restaurantId}|${c.slug}`] || 0) + 1;
  out.categories.duplicates = Object.values(catKeyCount).filter((n) => n > 1).length;

  // ---- Products ----
  const prods = await Product.find({}).lean();
  out.products.total = prods.length;
  out.products.withPrice = prods.filter((p) => typeof p.price === 'number' && p.price > 0).length;
  out.products.freePrice = prods.filter((p) => p.price === 0).length;
  out.products.noPrice = prods.filter((p) => typeof p.price !== 'number').length;
  out.products.withOldPrice = prods.filter((p) => p.oldPrice != null).length;
  out.products.withDiscount = prods.filter((p) => p.discount != null).length;
  out.products.unavailable = prods.filter((p) => p.available === false).length;
  out.products.withImage = prods.filter((p) => !!p.image).length;
  out.products.withoutImage = prods.filter((p) => !p.image).length;
  out.products.orphanRestaurant = prods.filter((p) => !restIds.has(String(p.restaurantId))).length;
  const catIds = new Set(cats.map((c) => String(c._id)));
  const catRestMap = new Map(cats.map((c) => [String(c._id), String(c.restaurantId)]));
  out.products.badCategoryRef = prods.filter((p) => !catIds.has(String(p.categoryId))).length;
  out.products.wrongRestaurantLink = prods.filter(
    (p) => catIds.has(String(p.categoryId)) && catRestMap.get(String(p.categoryId)) !== String(p.restaurantId)
  ).length;
  const prodKeyCount = {};
  for (const p of prods) prodKeyCount[p.slug] = (prodKeyCount[p.slug] || 0) + 1;
  out.products.duplicateSlugs = Object.values(prodKeyCount).filter((n) => n > 1).length;

  // ---- Local image files ----
  const pubDir = path.join(__dirname, '..', '..', 'public', 'restaurants');
  let localFiles = 0;
  if (fs.existsSync(pubDir)) {
    for (const d of fs.readdirSync(pubDir)) {
      localFiles += fs.readdirSync(path.join(pubDir, d)).length;
    }
  }
  out.images.localFiles = localFiles;

  // product.image pointing outside /restaurants/<slug>/ or unsplash/generic?
  const foreign = prods.filter((p) => p.image && (!p.image.startsWith('/restaurants/') || /unsplash|placehold|example/.test(p.image)));
  out.images.foreignOrGeneric = foreign.length;
  out.images.foreignSamples = foreign.slice(0, 5).map((p) => ({ slug: p.slug, image: p.image }));

  // missing local files referenced by products
  let missingLocal = 0;
  const missingSamples = [];
  for (const p of prods) {
    if (!p.image) continue;
    if (!fs.existsSync(path.join(__dirname, '..', '..', 'public', p.image.replace(/^\//, '')))) {
      missingLocal++;
      if (missingSamples.length < 5) missingSamples.push(p.image);
    }
  }
  out.images.missingLocalFiles = missingLocal;
  out.images.missingSamples = missingSamples;

  console.log(JSON.stringify(out, null, 2));
  const mongoose = require('mongoose');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});


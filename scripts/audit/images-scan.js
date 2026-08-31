// Image integrity scan (read-only):
// - every referenced image file exists on disk
// - no image file is shared by two different products / restaurants
// - restaurant covers exist and are unique per restaurant
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB } = require('../../lib/db');
const Restaurant = require('../../lib/models/Restaurant');
const Product = require('../../lib/models/Product');

async function main() {
  await connectDB();
  const problems = [];

  const rests = await Restaurant.find({}).lean();
  const coverMap = new Map();
  for (const r of rests) {
    const img = r.image || r.logoUrl;
    if (!img) {
      problems.push(`restaurant ${r.slug}: no image`);
      continue;
    }
    if (!fs.existsSync(path.join('public', img.replace(/^\//, '')))) {
      problems.push(`restaurant ${r.slug}: missing file ${img}`);
    }
    if (coverMap.has(img)) problems.push(`cover shared: ${img} used by ${r.slug} AND ${coverMap.get(img)}`);
    else coverMap.set(img, r.slug);
  }

  const prods = await Product.find({ image: { $ne: null } }).lean();
  const prodMap = new Map();
  for (const p of prods) {
    if (!fs.existsSync(path.join('public', p.image.replace(/^\//, '')))) {
      problems.push(`product ${p.slug}: missing file ${p.image}`);
    }
    if (prodMap.has(p.image)) problems.push(`product image shared: ${p.image} -> ${prodMap.get(p.image)} AND ${p.slug}`);
    else prodMap.set(p.image, p.slug);
    // cross-store contamination: product image path must live under its own restaurant folder
    const restSlug = p.slug.split('__')[0];
    if (!p.image.startsWith(`/restaurants/${restSlug}/`)) {
      problems.push(`cross-restaurant image: ${p.slug} uses ${p.image}`);
    }
  }

  const noImg = await Product.countDocuments({ image: null });
  console.log(JSON.stringify({
    restaurants_checked: rests.length,
    products_with_image_checked: prods.length,
    products_without_image_placeholder_allowed: noImg,
    unique_product_images: prodMap.size,
    unique_covers: coverMap.size,
    problems: problems.length,
    samples: problems.slice(0, 10),
  }, null, 1));

  const mongoose = require('mongoose');
  await mongoose.disconnect();
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});

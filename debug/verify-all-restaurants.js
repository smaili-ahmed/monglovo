// Final verification: DB report, relations, image coverage — exits non-zero on inconsistency.
require('dotenv').config();
const { connectDB } = require('../lib/db');
const Restaurant = require('../lib/models/Restaurant');
const Category = require('../lib/models/Category');
const Product = require('../lib/models/Product');

async function main() {
  await connectDB();

  const [restaurants, categories, products] = await Promise.all([
    Restaurant.countDocuments(),
    Category.countDocuments(),
    Product.countDocuments(),
  ]);

  const catIds = new Set((await Category.find().select('_id').lean()).map((c) => String(c._id)));
  const catRestaurant = new Map(
    (await Category.find().select('_id restaurantId').lean()).map((c) => [String(c._id), String(c.restaurantId)])
  );

  let linkedOk = 0;
  let wrongRestaurant = 0;
  let wrongCategory = 0;

  for await (const p of Product.find().cursor()) {
    const rId = String(p.restaurantId);
    const cId = String(p.categoryId);
    if (!catIds.has(cId)) wrongCategory++;
    else if (catRestaurant.get(cId) !== rId) wrongRestaurant++;
    else linkedOk++;
  }

  const orphanCategories = await Category.countDocuments({
    restaurantId: { $nin: (await Restaurant.find().select('_id').lean()).map((r) => r._id) },
  });

  console.log('══════════════════════════════════════════');
  console.log('VERIFY-ALL-RESTAURANTS');
  console.log('══════════════════════════════════════════');
  console.log(`Restaurants : ${restaurants}`);
  console.log(`Categories  : ${categories}`);
  console.log(`Products    : ${products}`);
  console.log('');
  console.log(`Products correctly linked : ${linkedOk}`);
  console.log(`Wrong restaurant relation : ${wrongRestaurant}`);
  console.log(`Wrong category relation   : ${wrongCategory}`);
  console.log(`Orphan products           : ${wrongCategory}`);
  console.log(`Orphan categories         : ${orphanCategories}`);

  const ok =
    wrongRestaurant === 0 &&
    wrongCategory === 0 &&
    orphanCategories === 0 &&
    restaurants > 0 &&
    products > 0;

  console.log(ok ? '\nRESULT: SUCCESS' : '\nRESULT: FAILURE');
  const mongoose = require('mongoose');
  await mongoose.disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});

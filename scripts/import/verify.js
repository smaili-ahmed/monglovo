require('dotenv').config();
const { connectDB } = require('../../lib/db');
const Restaurant = require('../../lib/models/Restaurant');
const Category = require('../../lib/models/Category');
const Product = require('../../lib/models/Product');

async function verify() {
  await connectDB();

  const [restaurants, categories, products] = await Promise.all([
    Restaurant.countDocuments(),
    Category.countDocuments(),
    Product.countDocuments(),
  ]);

  console.log('══════════════════════════════════════════');
  console.log('OUJDA FOOD — DATABASE REPORT');
  console.log('══════════════════════════════════════════');
  console.log(`Restaurants : ${restaurants}`);
  console.log(`Categories  : ${categories}`);
  console.log(`Products    : ${products}\n`);
  console.log('Restaurant'.padEnd(44) + 'Categories'.padEnd(14) + 'Products');
  console.log('-'.repeat(72));

  const rests = await Restaurant.find().sort({ name: 1 }).lean();
  for (const r of rests) {
    const c = await Category.countDocuments({ restaurantId: r._id });
    const p = await Product.countDocuments({ restaurantId: r._id });
    const flag = r.dataMissing ? ' (no menu)' : '';
    console.log(`${(r.name + flag).slice(0, 43).padEnd(44)}${String(c).padEnd(14)}${p}`);
  }

  // ---- relation checks ----
  const catIds = new Set((await Category.find().select('_id').lean()).map((c) => String(c._id)));
  const restCats = new Map(); // categoryId -> restaurantId
  for (const c of await Category.find().select('_id restaurantId').lean()) {
    restCats.set(String(c._id), String(c.restaurantId));
  }

  let linkedOk = 0;
  let wrongRestaurant = 0;
  let wrongCategory = 0;
  let orphans = 0;

  const prodCursor = Product.find().cursor();
  for await (const p of prodCursor) {
    if (!restCats.has(String(p.categoryId))) {
      wrongCategory++;
      continue;
    }
    if (String(p.restaurantId) !== restCats.get(String(p.categoryId))) wrongRestaurant++;
    else linkedOk++;
    if (!catIds.has(String(p.categoryId))) orphans++;
  }

  const orphanCategories = await Category.countDocuments({
    restaurantId: { $nin: (await Restaurant.find().select('_id').lean()).map((r) => r._id) },
  });

  console.log('\nRelations correctes :', linkedOk);
  console.log('Wrong restaurant relation :', wrongRestaurant);
  console.log('Wrong category relation    :', wrongCategory);
  console.log('Orphan products            :', orphans);
  console.log('Orphan categories          :', orphanCategories);

  const mongoose = require('mongoose');
  await mongoose.disconnect();
}

verify().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});

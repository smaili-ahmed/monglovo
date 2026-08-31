const fs = require('fs');
const raw = fs.readFileSync(process.argv[2] || 'verify-mongo.json', 'utf8');
const start = raw.indexOf('{\n  "restaurants"');
const j = JSON.parse(raw.slice(start));
console.log(
  JSON.stringify(
    {
      restaurants: j.restaurants.total,
      categories: j.categories.total,
      products: j.products.total,
      promotions_oldPrice: j.products.withOldPrice,
      promotions_discount: j.products.withDiscount,
      products_withImage: j.products.withImage,
      products_withoutImage: j.products.withoutImage,
      orphanProducts: j.products.orphanRestaurant,
      badCategoryRef: j.products.badCategoryRef,
      wrongRestaurantLink: j.products.wrongRestaurantLink,
      orphanCategories: j.categories.orphan,
      restaurantDuplicateSlugs: j.restaurants.duplicateSlugs.length,
      productDuplicateSlugs: j.products.duplicateSlugs.length,
      restaurantsWithoutSlug: j.restaurants.noSlug,
      foreignImages: j.images.foreignOrGeneric,
      missingLocalFiles: j.images.missingLocalFiles,
    },
    null,
    1
  )
);

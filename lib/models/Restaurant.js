const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    glovoUrl: String,
    glovoStoreId: Number,
    image: String,
    logoUrl: String,
    rating: String,
    reviews: String,
    cuisines: [String],
    promotion: String,
    city: { type: String, default: 'oujda' },
    open: Boolean,
    dataMissing: { type: Boolean, default: false },
    source: { type: String, default: 'glovo' },
    lastScrapedAt: Date,
  },
  { timestamps: true, collection: 'restaurants' }
);

module.exports =
  mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema);

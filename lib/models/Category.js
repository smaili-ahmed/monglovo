const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    position: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'categories' }
);

CategorySchema.index({ restaurantId: 1, slug: 1 }, { unique: true });

module.exports =
  mongoose.models.Category || mongoose.model('Category', CategorySchema);

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    price: { type: Number, default: null },
    oldPrice: { type: Number, default: null },
    discount: { type: Number, default: null },
    image: { type: String, default: null },
    available: { type: Boolean, default: true },
    position: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'products' }
);

ProductSchema.index({ restaurantId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);

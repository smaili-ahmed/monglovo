const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/glovo-clone').then(() => {
  const { default: Restaurant } = require('./lib/models/Restaurant');
  const { default: Category } = require('./lib/models/Category');
  const { default: Product } = require('./lib/models/Product');
  
  Restaurant.findOne({}).lean().then(r => {
    console.log('Restaurant _id type:', typeof r._id, 'value:', r._id);
    console.log('Product restaurantId schema instance:', Product.schema.path('restaurantId').instance);
    
    Product.find({ restaurantId: r._id }).lean().then(prods => {
      console.log('Found products:', prods.length);
      mongoose.disconnect();
    }).catch(e => {
      console.error('Product find error:', e.message);
      mongoose.disconnect();
    });
  }).catch(e => {
    console.error('Restaurant find error:', e.message);
    mongoose.disconnect();
  });
}).catch(e => {
  console.error('Connect error:', e.message);
});
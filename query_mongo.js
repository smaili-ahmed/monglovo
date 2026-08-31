const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/glovo-oujda').then(() => {
  const Product = mongoose.model('Product', new mongoose.Schema({name: String, description: String}));
  return Product.find({}).limit(10).lean();
}).then(docs => {
  console.log('=== First 10 products ===');
  console.log(JSON.stringify(docs, null, 2));
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
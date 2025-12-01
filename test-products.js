const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function testProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rbs-grocery');
    console.log('Connected to MongoDB');
    
    const count = await Product.countDocuments();
    console.log('Total products in DB:', count);
    
    const products = await Product.find().limit(5);
    console.log('\nFirst 5 products:');
    products.forEach(p => {
      console.log(`- ${p.name} | $${p.price} | ${p.category} | InStock: ${p.inStock}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testProducts();

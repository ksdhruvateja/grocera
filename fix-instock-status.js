const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function fixInStockStatus() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopping';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products to check`);

    let fixedCount = 0;
    const updates = [];

    for (const product of products) {
      const qty = product.quantity || 0;
      const shouldBeInStock = qty > 0;
      
      if (product.inStock !== shouldBeInStock) {
        product.inStock = shouldBeInStock;
        updates.push(product.save());
        fixedCount++;
        console.log(`  🔧 Fixing: ${product.name} - Quantity: ${qty}, inStock: ${product.inStock} → ${shouldBeInStock}`);
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`\n✅ Fixed inStock status for ${fixedCount} products`);
    } else {
      console.log('\n✅ All products already have correct inStock status');
    }

    // Summary
    const inStockCount = await Product.countDocuments({ inStock: true });
    const outOfStockCount = await Product.countDocuments({ inStock: false });
    console.log(`\n📊 Summary:`);
    console.log(`   In Stock: ${inStockCount}`);
    console.log(`   Out of Stock: ${outOfStockCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixInStockStatus();


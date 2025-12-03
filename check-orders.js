const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
require('dotenv').config();

async function checkOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rbs-grocery');
    console.log('Connected to MongoDB\n');
    
    const total = await Order.countDocuments();
    console.log('Total orders in DB:', total);
    
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('userId', 'name email')
      .limit(10)
      .lean();
    
    console.log('\nFirst 10 orders:');
    orders.forEach((o, i) => {
      console.log(`\n${i + 1}. OrderNumber: ${o.orderNumber}`);
      console.log(`   Status: ${o.status}`);
      console.log(`   PaymentStatus: ${o.paymentStatus}`);
      console.log(`   PaymentMethod: ${o.paymentMethod}`);
      console.log(`   User: ${o.user?.name || o.userId?.name || 'N/A'}`);
      console.log(`   Email: ${o.user?.email || o.userId?.email || 'N/A'}`);
      console.log(`   Total: $${o.totalAmount}`);
      console.log(`   Created: ${o.createdAt}`);
    });
    
    // Check for orders without user reference
    const orphanedOrders = await Order.countDocuments({ 
      $or: [
        { user: { $exists: false } },
        { userId: { $exists: false } }
      ]
    });
    
    if (orphanedOrders > 0) {
      console.log(`\n⚠️ Found ${orphanedOrders} orders without user reference`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkOrders();

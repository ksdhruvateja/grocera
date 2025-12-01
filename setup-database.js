#!/usr/bin/env node

/**
 * MongoDB Setup Verification Script
 * Checks if MongoDB is connected and sets up initial data
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

async function setupDatabase() {
  try {
    log('\n🚀 Starting MongoDB Setup...', 'cyan');
    log('═'.repeat(50), 'cyan');
    
    // Check if MongoDB URI is set
    if (!process.env.MONGODB_URI) {
      log('\n❌ ERROR: MONGODB_URI not found in .env file', 'red');
      log('\n📝 Please follow these steps:', 'yellow');
      log('1. Get MongoDB Atlas connection string from:', 'yellow');
      log('   https://www.mongodb.com/cloud/atlas', 'cyan');
      log('2. Add to backend/.env file:', 'yellow');
      log('   MONGODB_URI=mongodb+srv://...', 'cyan');
      log('3. Run this script again\n', 'yellow');
      process.exit(1);
    }
    
    log('\n📡 Connecting to MongoDB...', 'blue');
    log(`   ${process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`, 'cyan');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    log('✅ Connected to MongoDB successfully!', 'green');
    log(`   Database: ${mongoose.connection.name}`, 'green');
    log(`   Host: ${mongoose.connection.host}`, 'green');
    
    // Check existing data
    log('\n📊 Checking database...', 'blue');
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    
    log(`   Users: ${userCount}`, 'cyan');
    log(`   Products: ${productCount}`, 'cyan');
    
    // Create sample admin if no users exist
    if (userCount === 0) {
      log('\n👤 Creating sample admin user...', 'blue');
      const adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@rbsgrocery.com',
        password: 'admin123',
        role: 'admin',
        phone: '+1234567890',
        address: {
          street: '123 Admin St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        isEmailVerified: true
      });
      
      await adminUser.save();
      log('✅ Admin user created!', 'green');
      log('   Email: admin@rbsgrocery.com', 'cyan');
      log('   Password: admin123', 'cyan');
      log('   ⚠️  Change password after first login!', 'yellow');
    }
    
    // Create sample products if none exist
    if (productCount === 0) {
      log('\n📦 Creating sample products...', 'blue');
      const sampleProducts = [
        {
          name: 'Basmati Rice Premium',
          description: 'Premium quality aged basmati rice from India. Perfect for biryanis and pulaos.',
          price: 24.99,
          category: 'Daily Essentials',
          image: '/images/basmati-rice.jpg',
          inStock: true,
          quantity: 50,
          unit: 'kg',
          tags: ['rice', 'basmati', 'premium', 'indian']
        },
        {
          name: 'Fresh Mango (Alphonso)',
          description: 'Juicy Alphonso mangoes from Ratnagiri. The king of mangoes!',
          price: 8.99,
          category: 'Fruits',
          image: '/images/alphonso-mango.jpg',
          inStock: true,
          quantity: 30,
          unit: 'kg',
          tags: ['mango', 'alphonso', 'fruit', 'seasonal']
        },
        {
          name: 'Organic Turmeric Powder',
          description: 'Pure organic turmeric powder. Essential for Indian cooking.',
          price: 5.99,
          category: 'Daily Essentials',
          image: '/images/turmeric.jpg',
          inStock: true,
          quantity: 100,
          unit: 'g',
          tags: ['spice', 'turmeric', 'organic', 'powder']
        },
        {
          name: 'Fresh Okra (Bhindi)',
          description: 'Fresh tender okra, perfect for making bhindi masala.',
          price: 3.99,
          category: 'Vegetables',
          image: '/images/okra.jpg',
          inStock: true,
          quantity: 25,
          unit: 'kg',
          tags: ['vegetable', 'okra', 'bhindi', 'fresh']
        },
        {
          name: 'Coconut Oil (Extra Virgin)',
          description: 'Cold-pressed extra virgin coconut oil for cooking and hair care.',
          price: 15.99,
          category: 'Daily Essentials',
          image: '/images/coconut-oil.jpg',
          inStock: true,
          quantity: 40,
          unit: 'l',
          tags: ['oil', 'coconut', 'virgin', 'cooking']
        }
      ];
      
      await Product.insertMany(sampleProducts);
      log(`✅ Created ${sampleProducts.length} sample products!`, 'green');
    }
    
    // Display collections info
    log('\n📁 Database Collections:', 'blue');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(col => {
      log(`   • ${col.name}`, 'cyan');
    });
    
    // Display indexes
    log('\n🔍 Checking Indexes for Data Isolation...', 'blue');
    
    try {
      const cartIndexes = await mongoose.connection.db.collection('carts').indexes();
      const orderIndexes = await mongoose.connection.db.collection('orders').indexes();
      
      log('   Cart Indexes:', 'cyan');
      cartIndexes.forEach(idx => {
        if (idx.name !== '_id_') {
          log(`      • ${idx.name}: ${JSON.stringify(idx.key)}`, 'green');
        }
      });
      
      log('   Order Indexes:', 'cyan');
      orderIndexes.forEach(idx => {
        if (idx.name !== '_id_') {
          log(`      • ${idx.name}: ${JSON.stringify(idx.key)}`, 'green');
        }
      });
    } catch (err) {
      log('   Collections not yet created (will be created on first use)', 'yellow');
    }
    
    log('\n═'.repeat(50), 'cyan');
    log('✅ MongoDB Setup Complete!', 'green');
    log('\n🎯 Next Steps:', 'blue');
    log('   1. Start backend: npm run dev', 'cyan');
    log('   2. Test API: http://localhost:5000/api/health', 'cyan');
    log('   3. Login as admin: admin@rbsgrocery.com / admin123', 'cyan');
    log('   4. Start building your grocery empire! 🛒\n', 'cyan');
    
  } catch (error) {
    log('\n❌ Setup Failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      log('\n💡 Troubleshooting:', 'yellow');
      log('   1. Check your MONGODB_URI is correct', 'yellow');
      log('   2. Ensure MongoDB Atlas IP whitelist includes your IP', 'yellow');
      log('   3. Verify MongoDB username/password are correct', 'yellow');
      log('   4. Check your internet connection\n', 'yellow');
    }
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log('📦 Database connection closed\n', 'cyan');
  }
}

// Run setup
setupDatabase();
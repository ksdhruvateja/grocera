const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rbs-grocery');
    console.log('✅ Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@rbsgrocery.com' });
    
    if (existingAdmin) {
      // Ensure fields and password are correct
      existingAdmin.role = 'admin';
      existingAdmin.firstName = existingAdmin.firstName || 'Admin';
      existingAdmin.lastName = existingAdmin.lastName || 'User';
      existingAdmin.name = existingAdmin.name || 'Admin User';
      existingAdmin.isActive = true;
      // Set plaintext to trigger pre-save hash once
      existingAdmin.password = 'admin123';
      await existingAdmin.save();
      console.log('✅ Admin user updated!');
      console.log('Email: admin@rbsgrocery.com');
      console.log('Password: admin123');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
      email: 'admin@rbsgrocery.com',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@rbsgrocery.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdminUser();
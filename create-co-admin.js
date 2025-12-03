const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function createCoAdminUser() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rbs-grocery';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Get email and password from command line or use defaults
    // Separate credentials for co-admin (different from admin)
    const email = process.argv[2] || 'coadmin@rbsgrocery.com';
    const password = process.argv[3] || 'coadmin2024'; // Different password
    const name = process.argv[4] || 'Co Admin User';

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      // Update existing user to co-admin
      existingUser.role = 'co-admin';
      // Set plaintext password; model will hash once in pre-save
      if (password) existingUser.password = password;
      await existingUser.save();
      console.log('✅ Existing user updated to co-admin role!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password || '(unchanged)'}`);
    } else {
      // Create new co-admin user
      // Split name properly for firstName/lastName validation
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || 'CoAdmin';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      const coAdminUser = new User({
        name: name,
        email: email.toLowerCase(),
        password: password, // plaintext; model pre-save will hash once
        role: 'co-admin',
        firstName: firstName.replace(/[^a-zA-Z\s]/g, ''), // Remove special chars for validation
        lastName: lastName.replace(/[^a-zA-Z\s]/g, '') || 'User'
      });

      await coAdminUser.save();
      console.log('✅ Co-admin user created successfully!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    }
    
    console.log('\n📋 Co-Admin Access:');
    console.log('   URL: http://localhost:3000/co-admin/orders');
    console.log('   Login with the credentials above');
    
  } catch (error) {
    console.error('❌ Error creating co-admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createCoAdminUser();


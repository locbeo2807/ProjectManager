// Script Thiết lập User Test
// Chạy script này để tạo user test trong cơ sở dữ liệu MongoDB

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../backend/src/models/User');

async function setupTestUsers() {
  try {
    // Kết nối tới MongoDB (điều chỉnh connection string nếu cần)
    await mongoose.connect('mongodb://localhost:27017/your_database_name', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('📡 Connected to MongoDB');

    // Dữ liệu user test
    const testUsers = [
      {
        userID: 'PM001',
        name: 'Project Manager',
        email: 'pm@test.com',
        password: '123456',
        role: 'PM',
        phoneNumber: '0123456789',
        gender: 'male',
        companyName: 'Test Company'
      },
      {
        userID: 'BA001',
        name: 'Business Analyst',
        email: 'ba@test.com',
        password: '123456',
        role: 'BA',
        phoneNumber: '0123456789',
        gender: 'female',
        companyName: 'Test Company'
      },
      {
        userID: 'DEV001',
        name: 'Developer',
        email: 'dev@test.com',
        password: '123456',
        role: 'Developer',
        phoneNumber: '0123456789',
        gender: 'male',
        companyName: 'Test Company'
      },
      {
        userID: 'QA001',
        name: 'QA Tester',
        email: 'qa@test.com',
        password: '123456',
        role: 'QA Tester',
        phoneNumber: '0123456789',
        gender: 'female',
        companyName: 'Test Company'
      }
    ];

    console.log('👥 Creating test users...');

    for (const userData of testUsers) {
      // Kiểm tra xem user đã tồn tại chưa
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash mật khẩu
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Tạo user
      const user = new User({
        ...userData,
        password: hashedPassword,
        isVerified: true, // Skip email verification for testing
        status: 'active'
      });

      await user.save();
      console.log(`✅ Created user: ${userData.name} (${userData.email}) - Role: ${userData.role}`);
      console.log(`   User ID: ${user._id}`);
    }

    console.log('\n🎉 Test users setup completed!');
    console.log('\n📋 User Credentials:');
    console.log('   PM:  pm@test.com / 123456 (role: PM)');
    console.log('   BA:  ba@test.com / 123456 (role: BA)');
    console.log('   DEV: dev@test.com / 123456 (role: Developer)');
    console.log('   QA:  qa@test.com / 123456');

    console.log('\n📝 Next steps:');
    console.log('   1. Copy the User IDs above');
    console.log('   2. Update test-workflow.js with actual User IDs');
    console.log('   3. Run: node test-workflow.js');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Hướng dẫn
console.log('🔧 Test Users Setup Script');
console.log('===========================');
console.log('');
console.log('This script creates test users for workflow testing.');
console.log('');
console.log('Requirements:');
console.log('- MongoDB running on localhost:27017');
console.log('- Backend dependencies installed');
console.log('- Update MongoDB connection string if needed');
console.log('');

// Chạy setup nếu được gọi trực tiếp
if (require.main === module) {
  setupTestUsers();
}

module.exports = { setupTestUsers };
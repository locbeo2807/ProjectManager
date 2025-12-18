// Migration Script để sửa User Statuses
// Script này cập nhật các user có status tiếng Anh thành giá trị tiếng Việt.

const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function migrateUserStatuses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('📡 Connected to MongoDB');

    // Định nghĩa mapping status từ tiếng Anh sang tiếng Việt
    const statusMappings = {
      'active': 'hoạt động',
      'pending': 'chờ xác thực',
      'locked': 'bị khóa'
    };

    // Lấy tất cả statuses tiếng Anh để tìm kiếm
    const englishStatuses = Object.keys(statusMappings);

    console.log('🔍 Finding users with English statuses...');

    // Tìm users có statuses cần cập nhật
    const usersToUpdate = await User.find({
      status: { $in: englishStatuses }
    });

    console.log(`📊 Found ${usersToUpdate.length} users with English statuses`);

    if (usersToUpdate.length === 0) {
      console.log('✅ No users need status updates. Migration complete.');
      return;
    }

    // Cập nhật từng user
    let updatedCount = 0;
    for (const user of usersToUpdate) {
      const newStatus = statusMappings[user.status];
      if (newStatus) {
        await User.updateOne(
          { _id: user._id },
          { $set: { status: newStatus } }
        );
        console.log(`✅ Updated user ${user.email}: '${user.status}' -> '${newStatus}'`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 Migration completed! Updated ${updatedCount} users.`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Instructions
console.log('🔧 User Statuses Migration Script');
console.log('==================================');
console.log('');
console.log('This script fixes existing users with English status values to Vietnamese.');
console.log('');
console.log('Requirements:');
console.log('- MongoDB connection available');
console.log('- .env file with MONGODB_URI');
console.log('- Backend dependencies installed');
console.log('');

// Chạy migration nếu được gọi trực tiếp
if (require.main === module) {
  migrateUserStatuses();
}

module.exports = { migrateUserStatuses };
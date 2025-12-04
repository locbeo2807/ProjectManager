// Migration Script to Fix User Roles
// This script updates any existing users with lowercase role values to the correct uppercase/case values as defined in the User model enum.

const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function migrateUserRoles() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('📡 Connected to MongoDB');

    // Define role mappings from lowercase to correct case
    const roleMappings = {
      'pm': 'PM',
      'ba': 'BA',
      'developer': 'Developer',
      'qa tester': 'QA Tester',
      'qc': 'QC',
      'scrum master': 'Scrum Master',
      'devops engineer': 'DevOps Engineer',
      'product owner': 'Product Owner'
    };

    // Get all lowercase roles to search for
    const lowercaseRoles = Object.keys(roleMappings);

    console.log('🔍 Finding users with lowercase roles...');

    // Find users with roles that need to be updated
    const usersToUpdate = await User.find({
      role: { $in: lowercaseRoles }
    });

    console.log(`📊 Found ${usersToUpdate.length} users with lowercase roles`);

    if (usersToUpdate.length === 0) {
      console.log('✅ No users need role updates. Migration complete.');
      return;
    }

    // Update each user
    let updatedCount = 0;
    for (const user of usersToUpdate) {
      const newRole = roleMappings[user.role];
      if (newRole) {
        await User.updateOne(
          { _id: user._id },
          { $set: { role: newRole } }
        );
        console.log(`✅ Updated user ${user.email}: '${user.role}' -> '${newRole}'`);
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
console.log('🔧 User Roles Migration Script');
console.log('===============================');
console.log('');
console.log('This script fixes existing users with lowercase role values to the correct case.');
console.log('');
console.log('Requirements:');
console.log('- MongoDB connection available');
console.log('- .env file with MONGODB_URI');
console.log('- Backend dependencies installed');
console.log('');

// Run migration if called directly
if (require.main === module) {
  migrateUserRoles();
}

module.exports = { migrateUserRoles };
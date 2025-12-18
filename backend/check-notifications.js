const mongoose = require('mongoose');
const Notification = require('./src/models/Notification');
require('./src/config/database');

async function checkNotifications() {
  try {
    const notifications = await Notification.find({})
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('Recent notifications:');
    notifications.forEach(notif => {
      console.log(`- ${notif.user?.name || 'Unknown'} (${notif.user?.role}): ${notif.message}`);
      console.log(`  Type: ${notif.type}, Created: ${notif.createdAt}`);
    });

    const baNotifications = await Notification.find({})
      .populate('user', 'name email role')
      .where('user.role').equals('BA')
      .sort({ createdAt: -1 });

    console.log(`\nFound ${baNotifications.length} notifications for BAs`);

  } catch (error) {
    console.error('Error:', error);
  }

  mongoose.connection.close();
}

checkNotifications();

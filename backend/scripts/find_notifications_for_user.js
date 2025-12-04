require('dotenv').config();
const connectDB = require('../src/config/database');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');

const argv = require('minimist')(process.argv.slice(2));
const { email, id, minutes = 60, limit = 50 } = argv;

if (!email && !id) {
  console.error('Usage: node find_notifications_for_user.js --email user@example.com  OR --id 64ab...');
  process.exit(1);
}

const run = async () => {
  await connectDB();
  try {
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (id) {
      user = await User.findById(id);
    }

    if (!user) {
      console.error('User not found');
      return process.exit(1);
    }

    console.log('Found user:', { id: user._id.toString(), email: user.email, name: user.name, role: user.role });

    const since = new Date(Date.now() - Number(minutes) * 60 * 1000);
    const notifications = await Notification.find({ user: user._id, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    if (!notifications || notifications.length === 0) {
      console.log(`No notifications for user in the last ${minutes} minutes`);
    } else {
      console.log(`Recent ${notifications.length} notifications:`);
      for (const n of notifications) {
        console.log('---');
        console.log('id:', n._id.toString());
        console.log('type:', n.type);
        console.log('message:', n.message);
        console.log('isRead:', n.isRead, 'deliveredAt:', n.deliveredAt, 'readAt:', n.readAt);
        console.log('createdAt:', n.createdAt);
        if (n.metadata) console.log('metadata:', JSON.stringify(n.metadata));
      }
    }
  } catch (err) {
    console.error('Error querying notifications', err);
  } finally {
    mongoose.connection.close();
  }
};

run();

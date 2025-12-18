const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/project-management')
.then(async () => {
  const users = await User.find({}).select('name email role');
  console.log('Users and roles:');
  users.forEach(user => {
    console.log(`${user.name} (${user.email}) - Role: ${user.role}`);
  });
  process.exit(0);
})
.catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

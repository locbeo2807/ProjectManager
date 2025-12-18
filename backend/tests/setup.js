const mongoose = require('mongoose');

beforeAll(async () => {
  // Connect to the test database
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  // Disconnect from the test database
  await mongoose.disconnect();
});

afterEach(async () => {
  // Clean up all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

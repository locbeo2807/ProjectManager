const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

module.exports = async function globalSetup() {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  process.env.MONGODB_URI = mongoUri;
  process.env.NODE_ENV = 'test';
  
  console.log('In-memory MongoDB started for testing');
};

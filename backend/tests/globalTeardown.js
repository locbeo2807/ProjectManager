const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

module.exports = async function globalTeardown() {
  if (mongoServer) {
    await mongoServer.stop();
    console.log('In-memory MongoDB stopped');
  }
};

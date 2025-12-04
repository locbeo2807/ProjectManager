const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

module.exports = async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  global.__MONGOSERVER__ = mongoServer;
};

module.exports.teardown = async () => {
  if (global.__MONGOSERVER__) {
    await global.__MONGOSERVER__.stop();
  }
};
module.exports = async () => {
  const mongoose = require('mongoose');
  await mongoose.disconnect();
  if (global.__MONGOSERVER__) {
    await global.__MONGOSERVER__.stop();
  }
};

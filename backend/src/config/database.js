if (process.env.USE_FAKE_DB === 'true') {
  module.exports = {
    async query() {
      return [];
    }, // ?????? getAll*
    async get() {
      return null;
    }, // ?????? getById/login
    async close() {},
  };
} else {
  module.exports = require('./database.real');
}

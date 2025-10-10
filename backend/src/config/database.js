if (process.env.USE_FAKE_DB === "true") {
  module.exports = {
    async query(){ return []; },  // สำหรับ getAll*
    async get(){ return null; },  // สำหรับ getById/login
    async close(){},
  };
} else {
  module.exports = require("./database.real");
}

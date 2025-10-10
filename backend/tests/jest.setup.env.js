process.env.JWT_SECRET  ||= "test";
process.env.SALT_ROUNDS ||= "1";
process.env.CLIENT_URL  ||= "http://localhost:3000";
process.env.NODE_ENV = "test";
const _setInterval = global.setInterval;
global.setInterval = (...args) => {
  const t = _setInterval(...args);
  if (t && typeof t.unref === 'function') t.unref();
  return t;
};

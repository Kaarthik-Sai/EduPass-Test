const crypto = require('crypto');
// e.g. PR-20261009-7F3A2C
module.exports = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PR-${d}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

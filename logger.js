const debug = require('debug');

module.exports = (namespace) => ({
  info: debug(`INFO:${namespace}`),
  debug: debug(`DEBUG:${namespace}`),
  warn: debug(`WARN:${namespace}`),
  error: debug(`ERROR:${namespace}`)
});

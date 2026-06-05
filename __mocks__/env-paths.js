const path = require('node:path');
const os = require('node:os');

module.exports = function envPaths(name, { suffix = 'nodejs' } = {}) {
  const base = path.join(os.tmpdir(), suffix ? `${name}-${suffix}` : name);
  return { data: base, config: base, cache: base, log: base, temp: base };
};

"use strict";

// Tiny argv parser: positional arguments plus --flag and --key value / --key=value.
function parseArgs(argv, valueFlags = []) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const [key, inline] = a.slice(2).split(/=(.*)/s, 2);
    if (valueFlags.includes(key)) {
      const value = inline !== undefined ? inline : argv[++i];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Option --${key} needs a value.`);
      }
      flags[key] = value;
    } else {
      flags[key] = true;
    }
  }
  return { positional, flags };
}

module.exports = { parseArgs };

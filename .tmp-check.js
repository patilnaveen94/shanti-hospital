const fs = require('fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const entries = Object.entries(lock.packages || {});
const hosts = new Map();
let noResolved = 0;
for (const [path, meta] of entries) {
  if (path === '' || meta.link) continue;
  if (!meta.resolved) { noResolved += 1; continue; }
  try { const h = new URL(meta.resolved).host; hosts.set(h, (hosts.get(h) || 0) + 1); } catch { hosts.set('(unparseable)', 1); }
}
console.log('lockfileVersion:', lock.lockfileVersion);
console.log('package entries:', entries.length);
console.log('entries with no resolved:', noResolved);
console.log('--- registry hosts ---');
for (const [h, n] of [...hosts].sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${h}`);
const bad = [...hosts.keys()].filter((h) => h !== 'registry.npmjs.org');
console.log(bad.length ? `\nSTILL PRIVATE: ${bad.join(', ')}` : '\nOK - public registry only');

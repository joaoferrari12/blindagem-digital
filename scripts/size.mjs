// Prints the gzipped size of the built site (what a visitor actually downloads on first load).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk('dist');
let raw = 0;
let gz = 0;
let firstLoadGz = 0;
for (const f of files) {
  const buf = readFileSync(f);
  const g = gzipSync(buf).length;
  raw += buf.length;
  gz += g;
  // First load: html + css + js + the two latin woff2 fonts (the browser picks woff2 and only the latin subset for pt/en).
  if (/\.(html|css|js)$/.test(f) || /latin-(400|700)-normal.*\.woff2$/.test(f)) firstLoadGz += g;
}
console.log(`dist: ${files.length} files, ${(raw / 1024).toFixed(1)} kB raw, ${(gz / 1024).toFixed(1)} kB gzipped`);
console.log(`first load (html + css + js + 2 latin woff2 fonts): ${(firstLoadGz / 1024).toFixed(1)} kB gzipped`);

/**
 * Merges catalog expansion batches into src/videos.catalog.json.
 * Skips entries whose id or youtubeId already exists.
 *
 * Usage (from repo root):
 *   node scripts/expand-catalog.mjs
 *   node scripts/expand-catalog.mjs scripts/catalog-expansion/batch1.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '../src/videos.catalog.json');
const defaultBatches = [
  path.join(__dirname, 'catalog-expansion/batch1.json'),
  path.join(__dirname, 'catalog-expansion/batch2.json')
];

const batchPaths = process.argv.length > 2
  ? process.argv.slice(2).map(p => path.resolve(p))
  : defaultBatches.filter(p => fs.existsSync(p));

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const existingIds = new Set(catalog.map(v => v.id));
const existingYoutube = new Set(catalog.map(v => v.youtubeId));

let added = 0;
for (const batchPath of batchPaths) {
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  for (const entry of batch) {
    if (existingIds.has(entry.id) || existingYoutube.has(entry.youtubeId)) continue;
    catalog.push(entry);
    existingIds.add(entry.id);
    existingYoutube.add(entry.youtubeId);
    added++;
  }
}

if (added === 0) {
  console.log('No new videos to add.');
  process.exit(0);
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Added ${added} videos. Catalog total: ${catalog.length}`);

const states = new Set(catalog.map(v => v.stateCode));
console.log(`States covered: ${states.size}`);

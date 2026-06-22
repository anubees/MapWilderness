/**
 * Re-tags existing glacier hikes and merges scripts/catalog-expansion/glaciers.json.
 *
 * Usage (from repo root):
 *   node scripts/apply-glacier-updates.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '../src/videos.catalog.json');
const glaciersPath = path.join(__dirname, 'catalog-expansion/glaciers.json');

const RECATEGORIZE = {
  'ak-001': ['glaciers', 'mountains'],
  'ak-004': ['glaciers', 'red-rock', 'mountains'],
  'ak-006': ['glaciers', 'caves', 'mountains'],
  'mt-001': ['glaciers', 'mountains', 'lush-green'],
  'wa-002': ['glaciers', 'lush-green', 'mountains']
};

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const newEntries = JSON.parse(fs.readFileSync(glaciersPath, 'utf8'));
const existingIds = new Set(catalog.map(v => v.id));
const existingYoutube = new Set(catalog.map(v => v.youtubeId));

let recategorized = 0;
for (const entry of catalog) {
  const categories = RECATEGORIZE[entry.id];
  if (!categories) continue;
  entry.categories = categories;
  recategorized++;
}

let added = 0;
for (const entry of newEntries) {
  if (existingIds.has(entry.id) || existingYoutube.has(entry.youtubeId)) continue;
  catalog.push(entry);
  existingIds.add(entry.id);
  existingYoutube.add(entry.youtubeId);
  added++;
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
const glacierCount = catalog.filter(v => v.categories[0] === 'glaciers').length;
console.log(`Recategorized ${recategorized} entries, added ${added}. Catalog total: ${catalog.length}`);
console.log(`Videos with glaciers as primary category: ${glacierCount}`);

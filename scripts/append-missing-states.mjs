/**
 * One-off catalog maintainer — fills remaining US states in videos.catalog.json.
 * Run from repo root: node scripts/append-missing-states.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const catalogPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/videos.catalog.json');

/** Final 13 states needed for full US coverage (verified YouTube IDs). */
const newVideos = [
  {
    id: 'ct-001',
    title: 'Bluff Point Coastal Preserve — Connecticut Shoreline',
    creator: 'Trail Wanderer',
    youtubeId: 'Bw9JBR0iRCQ',
    duration: '42 min',
    difficulty: 'Moderate',
    distance: '3.5 miles',
    tags: ['hiking', 'bluff point', 'connecticut', 'shoreline', 'long island sound'],
    lat: 41.321,
    lng: -72.046,
    stateCode: 'CT',
    categories: ['lush-green']
  },
  {
    id: 'de-001',
    title: 'Cape Henlopen State Park — Coastal Trails',
    creator: 'Destination Delaware',
    youtubeId: 'SJvHj3CbkB0',
    duration: '18 min',
    difficulty: 'Easy',
    distance: '2.5 miles',
    tags: ['hiking', 'cape henlopen', 'delaware', 'dunes', 'atlantic coast'],
    lat: 38.793,
    lng: -75.088,
    stateCode: 'DE',
    categories: ['lush-green']
  },
  {
    id: 'il-001',
    title: 'Starved Rock — St. Louis Canyon',
    creator: 'Explore Travels',
    youtubeId: '4shZ0wMTPaM',
    duration: '35 min',
    difficulty: 'Moderate',
    distance: '2.5 miles',
    tags: ['hiking', 'starved rock', 'illinois', 'waterfall', 'canyon'],
    lat: 41.321,
    lng: -88.992,
    stateCode: 'IL',
    categories: ['canyons', 'lush-green']
  },
  {
    id: 'ia-001',
    title: 'Effigy Mounds — Fire Point Loop',
    creator: 'Park Travel Review',
    youtubeId: 'ZqT1uwzGPqA',
    duration: '40 min',
    difficulty: 'Moderate',
    distance: '2 miles',
    tags: ['hiking', 'effigy mounds', 'iowa', 'mississippi river', 'native american'],
    lat: 43.095,
    lng: -91.186,
    stateCode: 'IA',
    categories: ['lush-green']
  },
  {
    id: 'ks-001',
    title: 'Konza Prairie Nature Trail — Flint Hills',
    creator: 'Park Travel Review',
    youtubeId: 'WKOibhkl3xE',
    duration: '32 min',
    difficulty: 'Moderate',
    distance: '2.6 miles',
    tags: ['hiking', 'konza prairie', 'kansas', 'tallgrass', 'flint hills'],
    lat: 39.088,
    lng: -96.593,
    stateCode: 'KS',
    categories: ['desert']
  },
  {
    id: 'la-001',
    title: 'Backbone Trail — Kisatchie Hills Wilderness',
    creator: 'Louisiana Hikes',
    youtubeId: 'qckF8JyiDzU',
    duration: '48 min',
    difficulty: 'Hard',
    distance: '7.5 miles',
    tags: ['backpacking', 'kisatchie', 'louisiana', 'wilderness', 'sandstone'],
    lat: 31.45,
    lng: -92.95,
    stateCode: 'LA',
    categories: ['mountains', 'lush-green']
  },
  {
    id: 'ma-001',
    title: 'Mount Greylock — Highest Peak in Massachusetts',
    creator: 'Trail Wanderer',
    youtubeId: 'pVYp7mUCh8k',
    duration: '38 min',
    difficulty: 'Hard',
    distance: '6 miles',
    tags: ['hiking', 'mount greylock', 'massachusetts', 'berkshires', 'summit'],
    lat: 42.637,
    lng: -73.166,
    stateCode: 'MA',
    categories: ['mountains', 'lush-green']
  },
  {
    id: 'md-001',
    title: 'Billy Goat Trail — Great Falls Section A',
    creator: 'Trail Wanderer',
    youtubeId: 'b2ikCoi5Ans',
    duration: '45 min',
    difficulty: 'Hard',
    distance: '1.7 miles',
    tags: ['hiking', 'billy goat trail', 'maryland', 'potomac', 'scrambling'],
    lat: 38.983,
    lng: -77.25,
    stateCode: 'MD',
    categories: ['canyons', 'lush-green']
  },
  {
    id: 'ms-001',
    title: 'Natchez Trace — Sunken Trace',
    creator: 'Roam Your Home',
    youtubeId: 'cwUT7YDIYeg',
    duration: '12 min',
    difficulty: 'Easy',
    distance: '0.5 miles',
    tags: ['hiking', 'natchez trace', 'mississippi', 'historic trail', 'sunken trace'],
    lat: 31.96,
    lng: -90.878,
    stateCode: 'MS',
    categories: ['lush-green']
  },
  {
    id: 'ne-001',
    title: 'Scotts Bluff — Saddle Rock Trail',
    creator: 'This is Nebraska',
    youtubeId: '8LxkWARMVfE',
    duration: '28 min',
    difficulty: 'Moderate',
    distance: '1.6 miles',
    tags: ['hiking', 'scotts bluff', 'nebraska', 'bluffs', 'great plains'],
    lat: 41.834,
    lng: -103.707,
    stateCode: 'NE',
    categories: ['desert', 'mountains']
  },
  {
    id: 'nj-001',
    title: 'Mount Tammany — Delaware Water Gap',
    creator: 'Backpacking Adventures',
    youtubeId: 'pwj9AvPG7aM',
    duration: '55 min',
    difficulty: 'Hard',
    distance: '3.5 miles',
    tags: ['hiking', 'mount tammany', 'new jersey', 'appalachian trail', 'water gap'],
    lat: 40.967,
    lng: -75.113,
    stateCode: 'NJ',
    categories: ['mountains', 'lush-green']
  },
  {
    id: 'nd-001',
    title: 'Theodore Roosevelt National Park — Badlands Loop',
    creator: 'Explore Travels',
    youtubeId: 'oD5IMWSZRBU',
    duration: '50 min',
    difficulty: 'Moderate',
    distance: '4 miles',
    tags: ['hiking', 'theodore roosevelt', 'north dakota', 'badlands', 'bison'],
    lat: 46.979,
    lng: -103.539,
    stateCode: 'ND',
    categories: ['desert', 'canyons']
  },
  {
    id: 'ri-001',
    title: 'Newport Cliff Walk — Ocean Path',
    creator: 'Trail Wanderer',
    youtubeId: '2p2WIFLpwoc',
    duration: '35 min',
    difficulty: 'Easy',
    distance: '3.5 miles',
    tags: ['hiking', 'cliff walk', 'newport', 'rhode island', 'ocean views'],
    lat: 41.35,
    lng: -71.066,
    stateCode: 'RI',
    categories: ['lush-green']
  }
];

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const existingIds = new Set(catalog.map(v => v.id));
const toAdd = newVideos.filter(v => !existingIds.has(v.id));

if (toAdd.length === 0) {
  console.log('All 13 state videos already present.');
} else {
  catalog.push(...toAdd);
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Added ${toAdd.length} videos. Catalog now has ${catalog.length} entries.`);
}

const states = new Set(catalog.map(v => v.stateCode));
console.log(`States covered: ${states.size}/50`);

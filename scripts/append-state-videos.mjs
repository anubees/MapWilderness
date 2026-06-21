/**
 * One-off catalog maintainer — appends state trail videos to videos.catalog.json.
 * Run from repo root: node scripts/append-state-videos.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '../src/videos.catalog.json');

const newVideos = [
  { id: 'me-001', title: 'Acadia Beehive Trail — Cliffside Loop', creator: 'Explore Travels', youtubeId: 'zpKLlU0ThwM', duration: '45 min', difficulty: 'Hard', distance: '1.5 miles', tags: ['hiking', 'acadia', 'beehive', 'maine', 'ocean views'], lat: 44.33, lng: -68.188, stateCode: 'ME', categories: ['mountains', 'lush-green'], placeId: 'acadia-beehive', placeName: 'Acadia Beehive' },
  { id: 'nh-001', title: 'Franconia Ridge Loop — White Mountains', creator: 'Mountain High Hikes', youtubeId: 'RoYwgwRqXwM', duration: '52 min', difficulty: 'Hard', distance: '8.5 miles', tags: ['hiking', 'franconia ridge', 'white mountains', 'appalachian trail'], lat: 44.148, lng: -71.644, stateCode: 'NH', categories: ['mountains', 'lush-green'] },
  { id: 'ny-001', title: 'Breakneck Ridge — Hudson Highlands Scramble', creator: 'Wandering Out Yonder', youtubeId: 'tUmA1SCBykw', duration: '48 min', difficulty: 'Hard', distance: '5.5 miles', tags: ['hiking', 'breakneck ridge', 'hudson highlands', 'scrambling'], lat: 41.444, lng: -73.975, stateCode: 'NY', categories: ['mountains', 'lush-green'] },
  { id: 'pa-001', title: 'Ricketts Glen Falls Trail — 21 Waterfalls', creator: 'Trail Wanderer', youtubeId: 'OYGYjE-Sf1c', duration: '55 min', difficulty: 'Hard', distance: '7 miles', tags: ['hiking', 'waterfall', 'ricketts glen', 'pennsylvania'], lat: 41.321, lng: -76.272, stateCode: 'PA', categories: ['lush-green', 'caves'] },
  { id: 'ga-001', title: 'Blood Mountain — Georgia AT Summit', creator: 'Homemade Wanderlust', youtubeId: 'UPojID9NuSs', duration: '42 min', difficulty: 'Hard', distance: '4.3 miles', tags: ['hiking', 'blood mountain', 'appalachian trail', 'georgia'], lat: 34.74, lng: -83.937, stateCode: 'GA', categories: ['mountains', 'lush-green'] },
  { id: 'sc-001', title: 'Table Rock Mountain — Blue Ridge Summit', creator: 'Build the Dream', youtubeId: 'Kxd3m_SB6F0', duration: '50 min', difficulty: 'Hard', distance: '7 miles', tags: ['hiking', 'table rock', 'blue ridge', 'waterfall'], lat: 35.024, lng: -82.697, stateCode: 'SC', categories: ['mountains', 'lush-green'] },
  { id: 'fl-001', title: 'Everglades Anhinga Trail — Wildlife Boardwalk', creator: 'Sloan\'s Wilderness Expeditions', youtubeId: 'aAQvqmSvJMM', duration: '28 min', difficulty: 'Easy', distance: '0.8 miles', tags: ['hiking', 'everglades', 'wildlife', 'wetlands'], lat: 25.384, lng: -80.597, stateCode: 'FL', categories: ['lush-green'] },
  { id: 'tx-001', title: 'Big Bend South Rim Loop — Chisos Mountains', creator: 'Desert Trail Films', youtubeId: '7enK2R3P5UE', duration: '85 min', difficulty: 'Hard', distance: '12.5 miles', tags: ['backpacking', 'big bend', 'south rim', 'desert'], lat: 29.226, lng: -103.303, stateCode: 'TX', categories: ['desert', 'mountains', 'canyons'] },
  { id: 'wy-001', title: 'Cascade Canyon — Grand Teton Jenny Lake', creator: 'Geoffrey Morrison', youtubeId: 'JaD8jk_odoA', duration: '58 min', difficulty: 'Moderate', distance: '9.4 miles', tags: ['hiking', 'grand teton', 'cascade canyon', 'wildlife'], lat: 43.761, lng: -110.723, stateCode: 'WY', categories: ['mountains', 'canyons'] },
  { id: 'mt-001', title: 'Glacier Highline Trail — Garden Wall', creator: 'Andy Schlichting', youtubeId: 'YsSl2Ugdk1E', duration: '72 min', difficulty: 'Moderate', distance: '12 miles', tags: ['hiking', 'glacier', 'highline trail', 'wildflowers'], lat: 48.696, lng: -113.717, stateCode: 'MT', categories: ['mountains', 'lush-green'] },
  { id: 'wa-001', title: 'Mount Rainier Skyline Loop — Paradise', creator: 'Molly Rose Outdoors', youtubeId: 'yg4t6qvfk7o', duration: '45 min', difficulty: 'Moderate', distance: '5.5 miles', tags: ['hiking', 'mount rainier', 'skyline trail', 'wildflowers'], lat: 46.786, lng: -121.735, stateCode: 'WA', categories: ['mountains'] },
  { id: 'or-001', title: 'Mount Scott — Crater Lake Summit', creator: 'Andy Neal', youtubeId: 'CTb3QRmJB2w', duration: '40 min', difficulty: 'Moderate', distance: '5 miles', tags: ['hiking', 'crater lake', 'mount scott', 'oregon'], lat: 42.922, lng: -122.016, stateCode: 'OR', categories: ['mountains', 'canyons'] },
  { id: 'nm-001', title: 'Kasha-Katuwe Tent Rocks — Slot Canyon', creator: 'Utah Trail Seekers', youtubeId: 'lPQX2NEMnKI', duration: '35 min', difficulty: 'Moderate', distance: '3 miles', tags: ['hiking', 'tent rocks', 'slot canyon', 'hoodoos'], lat: 35.661, lng: -106.408, stateCode: 'NM', categories: ['desert', 'red-rock', 'caves'] },
  { id: 'id-001', title: 'Sawtooth Lake — Stanley Alpine Hike', creator: 'Wonder Mich', youtubeId: 'CSF57bdi6gc', duration: '65 min', difficulty: 'Hard', distance: '10 miles', tags: ['hiking', 'sawtooth', 'alpine lake', 'idaho'], lat: 44.088, lng: -114.961, stateCode: 'ID', categories: ['mountains'] },
  { id: 'hi-001', title: 'Kalalau Trail — Nā Pali Coast', creator: 'Adventure Couple', youtubeId: 'XcZaaYLme6A', duration: '90 min', difficulty: 'Hard', distance: '22 miles', tags: ['backpacking', 'kalalau', 'napali coast', 'hawaii'], lat: 22.17, lng: -159.653, stateCode: 'HI', categories: ['lush-green', 'canyons'] },
  { id: 'ak-001', title: 'Harding Icefield Trail — Exit Glacier', creator: 'Tim & Shannon Living The Dream', youtubeId: '9FfJZnUlfsY', duration: '75 min', difficulty: 'Hard', distance: '8.2 miles', tags: ['hiking', 'harding icefield', 'exit glacier', 'alaska'], lat: 60.178, lng: -149.926, stateCode: 'AK', categories: ['mountains'] },
  { id: 'mn-001', title: 'Superior Hiking Trail — North Shore', creator: 'Backpacking Adventures', youtubeId: 'I-KL7ZA_dqE', duration: '48 min', difficulty: 'Moderate', distance: '8 miles', tags: ['hiking', 'superior hiking trail', 'lake superior', 'minnesota'], lat: 47.75, lng: -90.34, stateCode: 'MN', categories: ['lush-green'] },
  { id: 'mi-001', title: 'Pictured Rocks Chapel Loop — Lake Superior', creator: 'Wandering Out Yonder', youtubeId: 't0Jq7RsvTgg', duration: '70 min', difficulty: 'Moderate', distance: '12 miles', tags: ['hiking', 'pictured rocks', 'lake superior', 'cliffs'], lat: 46.667, lng: -86.017, stateCode: 'MI', categories: ['lush-green', 'canyons'] },
  { id: 'wi-001', title: "Devil's Lake East Bluff — Wisconsin Dells", creator: 'High Country Hikers', youtubeId: 'oKXVwIEi6ac', duration: '38 min', difficulty: 'Moderate', distance: '4 miles', tags: ['hiking', 'devils lake', 'wisconsin', 'bluff'], lat: 43.422, lng: -89.73, stateCode: 'WI', categories: ['mountains', 'lush-green'] },
  { id: 'mo-001', title: 'Taum Sauk Mountain — Mina Sauk Falls Loop', creator: 'Ozark Trail Association', youtubeId: '4PTJhfLyD7w', duration: '55 min', difficulty: 'Moderate', distance: '3 miles', tags: ['hiking', 'taum sauk', 'ozarks', 'waterfall'], lat: 37.571, lng: -90.722, stateCode: 'MO', categories: ['lush-green', 'mountains'] },
  { id: 'ar-001', title: 'Whitaker Point — Hawksbill Crag', creator: 'George and Cris', youtubeId: 'CC628pJPLSI', duration: '32 min', difficulty: 'Moderate', distance: '2.7 miles', tags: ['hiking', 'hawksbill crag', 'ozarks', 'arkansas'], lat: 36.079, lng: -93.387, stateCode: 'AR', categories: ['lush-green', 'mountains'] },
  { id: 'nv-001', title: 'Calico Tanks Trail — Red Rock Canyon', creator: 'Utah Desert Views', youtubeId: 'fc8BXruJN08', duration: '30 min', difficulty: 'Moderate', distance: '2.4 miles', tags: ['hiking', 'red rock canyon', 'calico tanks', 'nevada'], lat: 36.159, lng: -115.433, stateCode: 'NV', categories: ['red-rock', 'desert'] },
  { id: 'sd-001', title: 'Badlands Notch Trail — Ladder Climb', creator: 'Nomads With A Purpose', youtubeId: '1sLlzgVYYpw', duration: '25 min', difficulty: 'Moderate', distance: '1.5 miles', tags: ['hiking', 'badlands', 'notch trail', 'hoodoos'], lat: 43.759, lng: -101.917, stateCode: 'SD', categories: ['desert', 'canyons'] },
  { id: 'vt-001', title: 'Mount Mansfield Summit — Long Trail', creator: 'Birthday Girl Hikes', youtubeId: '86A8AICnvYI', duration: '60 min', difficulty: 'Hard', distance: '7 miles', tags: ['hiking', 'mount mansfield', 'long trail', 'vermont'], lat: 44.544, lng: -72.814, stateCode: 'VT', categories: ['mountains', 'lush-green'] },
  { id: 'al-001', title: 'Cheaha Mountain — Bald Rock Overlook', creator: 'Peak Bagger', youtubeId: 'O0NtFYovlUo', duration: '35 min', difficulty: 'Easy', distance: '1.5 miles', tags: ['hiking', 'cheaha', 'talladega', 'alabama'], lat: 33.486, lng: -85.809, stateCode: 'AL', categories: ['mountains', 'lush-green'] },
  { id: 'ok-001', title: 'Elk Mountain — Wichita Mountains', creator: 'Visit Oklahoma', youtubeId: 'J8ZFVlXtfgk', duration: '40 min', difficulty: 'Moderate', distance: '2.2 miles', tags: ['hiking', 'wichita mountains', 'elk mountain', 'oklahoma'], lat: 34.709, lng: -98.623, stateCode: 'OK', categories: ['mountains', 'red-rock'] },
  { id: 'oh-001', title: "Old Man's Cave — Hocking Hills Gorge", creator: 'Wander the Woods', youtubeId: 'DAQqGgV-1bo', duration: '42 min', difficulty: 'Moderate', distance: '1 mile', tags: ['hiking', 'hocking hills', 'old mans cave', 'waterfall'], lat: 39.432, lng: -82.536, stateCode: 'OH', categories: ['lush-green', 'caves'] },
  { id: 'in-001', title: 'Indiana Dunes 3 Dune Challenge', creator: 'Family Trail Time', youtubeId: 'nxWHPWso45o', duration: '28 min', difficulty: 'Moderate', distance: '1.5 miles', tags: ['hiking', 'indiana dunes', 'sand dunes', 'lake michigan'], lat: 41.653, lng: -87.052, stateCode: 'IN', categories: ['desert', 'lush-green'] }
];

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const existingIds = new Set(catalog.map(v => v.id));
const toAdd = newVideos.filter(v => !existingIds.has(v.id));

if (toAdd.length === 0) {
  console.log('No new videos to add.');
  process.exit(0);
}

const merged = [...catalog, ...toAdd];
fs.writeFileSync(catalogPath, JSON.stringify(merged, null, 2) + '\n');
console.log(`Added ${toAdd.length} videos. Total: ${merged.length}`);

const states = new Set(merged.map(v => v.stateCode));
console.log(`States covered: ${states.size} — ${[...states].sort().join(', ')}`);

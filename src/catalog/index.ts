/**
 * Video catalogs — edit JSON files to add or change wilderness.
 *
 * Datasets:
 *   videos.catalog.json           — main curated list
 *   preferred.videos.catalog.json — featured picks (carousel top; empty by default)
 *
 * Schema:
 *   id, title, creator, youtubeId, duration, difficulty, distance,
 *   tags, lat, lng, stateCode, categories[]
 *   Optional: placeId, placeName, regionId (defaults to "us")
 *
 * Categories: categories.ts → WILDERNESS_CATEGORIES
 */

export {
  getEnrichedCatalog,
  getEnrichedPreferredCatalog,
  getEnrichedAllVideos,
  type VideoWithCategory
} from './loader';

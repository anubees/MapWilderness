/**
 * Video catalog — edit videos.catalog.json to add or change wilderness.
 *
 * Schema:
 *   id, title, creator, youtubeId, duration, difficulty, distance,
 *   tags, lat, lng, stateCode, categories[]
 *   Optional: placeId, placeName, regionId (defaults to "us")
 *
 * Featured order: curated.config.ts → PREFERRED_VIDEO_IDS
 * Categories: categories.ts → WILDERNESS_CATEGORIES
 */

export { getEnrichedCatalog, type VideoWithCategory } from './loader';

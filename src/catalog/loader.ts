import { CuratedVideoEntry, WildernessVideo } from '../types';
import { getCategory, getCategoryIdsForVideo } from '../categories';
import catalog from '../videos.catalog.json';
import preferredCatalog from '../preferred.videos.catalog.json';

const DEFAULT_REGION_ID = 'us';

/** Builds the YouTube hqdefault thumbnail URL for an embed id. */
function youtubeThumbnail(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/** Raw JSON row → normalized video record used by the app. */
export function normalizeCatalogEntry(entry: CuratedVideoEntry): WildernessVideo {
  const regionId = entry.regionId ?? DEFAULT_REGION_ID;
  const placeId = entry.placeId ?? `${entry.lat.toFixed(2)},${entry.lng.toFixed(2)}`;

  return {
    id: entry.id,
    title: entry.title,
    creator: entry.creator,
    youtubeId: entry.youtubeId,
    duration: entry.duration,
    difficulty: entry.difficulty,
    distance: entry.distance,
    thumbnail: youtubeThumbnail(entry.youtubeId),
    tags: entry.tags,
    lat: entry.lat,
    lng: entry.lng,
    placeId,
    stateCode: entry.stateCode,
    placeName: entry.placeName,
    regionId
  };
}

export type VideoWithCategory = WildernessVideo & {
  categoryIds: string[];
  category: string;
  categoryName: string;
  /** True when the row comes from preferred.videos.catalog.json. */
  isPreferred: boolean;
};

/** Catalog is loaded once at build time; enrichVideo adds resolved category metadata. */
export function enrichVideo(video: WildernessVideo, isPreferred = false): VideoWithCategory {
  const categoryIds = getCategoryIdsForVideo(video.id);
  const category = categoryIds[0];
  const categoryName = getCategory(category)?.name ?? category;
  return { ...video, categoryIds, category, categoryName, isPreferred };
}

const curatedNormalized = (catalog as CuratedVideoEntry[]).map(normalizeCatalogEntry);
const preferredNormalized = (preferredCatalog as CuratedVideoEntry[]).map(normalizeCatalogEntry);

const enrichedCurated = curatedNormalized.map(v => enrichVideo(v, false));
const enrichedPreferred = preferredNormalized.map(v => enrichVideo(v, true));

/** Main curated catalog with category metadata. */
export function getEnrichedCatalog(): VideoWithCategory[] {
  return enrichedCurated;
}

/** Preferred curated catalog (featured picks, shown first in the carousel). */
export function getEnrichedPreferredCatalog(): VideoWithCategory[] {
  return enrichedPreferred;
}

/** Combined lookup pool (preferred first, then curated; no duplicate ids). */
export function getEnrichedAllVideos(): VideoWithCategory[] {
  const preferredIds = new Set(enrichedPreferred.map(v => v.id));
  return [...enrichedPreferred, ...enrichedCurated.filter(v => !preferredIds.has(v.id))];
}

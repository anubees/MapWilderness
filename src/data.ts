/**
 * Query helpers over the enriched catalogs.
 * Filtering, search, and area-code lookups used by the map and carousel.
 */
import { getVideoAreaLabel } from './geo/area-labels';
import {
  getEnrichedAllVideos,
  getEnrichedCatalog,
  getEnrichedPreferredCatalog,
  type VideoWithCategory
} from './catalog';
import { getCategory, getCategoryColor, WILDERNESS_CATEGORIES } from './categories';

export type { VideoWithCategory };

export interface FilteredVideoSets {
  preferred: VideoWithCategory[];
  curated: VideoWithCategory[];
}

type FilterOptions = {
  query?: string;
  categoryId?: string | null;
  stateCode?: string | null;
  difficulty?: string;
  favoritesOnly?: boolean;
  favoriteIds?: string[];
};

/** Applies shared filter options to one catalog list. */
function applyFilters(videos: VideoWithCategory[], options: FilterOptions): VideoWithCategory[] {
  const lower = (options.query ?? '').toLowerCase().trim();
  let results = videos;

  if (options.categoryId) {
    results = results.filter(v => v.category === options.categoryId);
  }

  if (options.favoritesOnly && options.favoriteIds) {
    results = results.filter(v => options.favoriteIds!.includes(v.id));
  }

  if (options.difficulty && options.difficulty !== 'all') {
    results = results.filter(v => v.difficulty.toLowerCase() === options.difficulty);
  }

  if (options.stateCode) {
    results = results.filter(v => v.stateCode === options.stateCode);
  }

  if (lower) {
    results = results.filter(v => {
      const areaName = getVideoAreaLabel(v.regionId, v.stateCode).toLowerCase();
      return (
        v.title.toLowerCase().includes(lower) ||
        v.creator.toLowerCase().includes(lower) ||
        v.categoryName.toLowerCase().includes(lower) ||
        v.categoryIds.some(id => getCategory(id)?.name.toLowerCase().includes(lower)) ||
        v.stateCode.toLowerCase().includes(lower) ||
        areaName.includes(lower) ||
        v.tags.some(tag => tag.includes(lower)) ||
        v.difficulty.toLowerCase().includes(lower)
      );
    });
  }

  return results;
}

/** Filters preferred and curated catalogs separately; curated excludes preferred ids. */
export function filterVideoSets(options: FilterOptions): FilteredVideoSets {
  const preferred = applyFilters(getEnrichedPreferredCatalog(), options);
  const preferredIds = new Set(preferred.map(v => v.id));
  const curated = applyFilters(getEnrichedCatalog(), options).filter(v => !preferredIds.has(v.id));
  return { preferred, curated };
}

/** Preferred videos first, then curated (for map markers and combined lists). */
export function filterVideos(options: FilterOptions): VideoWithCategory[] {
  const { preferred, curated } = filterVideoSets(options);
  return [...preferred, ...curated];
}

/** Looks up one enriched video by id (preferred catalog first). */
export function findVideoById(videoId: string): VideoWithCategory | undefined {
  return getEnrichedAllVideos().find(v => v.id === videoId);
}

/** Returns the full combined catalog with no filters applied. */
export function getAllVideos(): VideoWithCategory[] {
  return filterVideos({});
}

export { WILDERNESS_CATEGORIES, getCategoryColor };

/** State/area codes present in a video list (respects active filters). */
export function getStateCodesFromVideos(videos: VideoWithCategory[]): Set<string> {
  const codes = new Set<string>();
  videos.forEach(v => codes.add(v.stateCode));
  return codes;
}

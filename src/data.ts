/**

 * Query helpers over the enriched catalog.

 * Filtering, search, and area-code lookups used by the map and carousel.

 */

import { getVideoAreaLabel } from './geo/area-labels';
import { getEnrichedCatalog, type VideoWithCategory } from './catalog';
import { sortByPreferred } from './catalog/loader';
import { getCategory, getCategoryColor, WILDERNESS_CATEGORIES } from './categories';



export type { VideoWithCategory };



/** Looks up one enriched catalog video by id. */

export function findVideoById(videoId: string): VideoWithCategory | undefined {

  return getEnrichedCatalog().find(v => v.id === videoId);

}



/** Applies search, category, state, difficulty, and favorites filters; results are preference-sorted. */

export function filterVideos(options: {

  query?: string;

  categoryId?: string | null;

  stateCode?: string | null;

  difficulty?: string;

  favoritesOnly?: boolean;

  favoriteIds?: string[];

}): VideoWithCategory[] {

  const lower = (options.query ?? '').toLowerCase().trim();

  let results = getEnrichedCatalog();



  if (options.categoryId) {

    results = results.filter(v => v.categoryIds.includes(options.categoryId!));

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



  return sortByPreferred(results);

}



/** Returns the full enriched catalog with no filters applied. */

export function getAllVideos(): VideoWithCategory[] {

  return filterVideos({});

}



export { WILDERNESS_CATEGORIES, getCategoryColor };



/** State/area codes that have at least one catalog video (US phase: state codes). */

export function getStateCodesWithWilderness(): Set<string> {

  const codes = new Set<string>();

  getAllVideos().forEach(v => codes.add(v.stateCode));

  return codes;

}



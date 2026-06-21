import { CuratedVideoEntry, WildernessVideo } from '../types';
import { getCategory, getCategoryIdsForVideo } from '../categories';
import { PREFERRED_VIDEO_IDS } from '../curated.config';
import catalog from '../videos.catalog.json';

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
};

/** Catalog is loaded once at build time; enrichVideo adds resolved category metadata. */
export function enrichVideo(video: WildernessVideo): VideoWithCategory {
  const categoryIds = getCategoryIdsForVideo(video.id);
  const category = categoryIds[0];
  const categoryName = getCategory(category)?.name ?? category;
  return { ...video, categoryIds, category, categoryName };
}

/** Puts PREFERRED_VIDEO_IDS first; unmatched videos keep catalog order. */
export function sortByPreferred(videos: VideoWithCategory[]): VideoWithCategory[] {
  if (PREFERRED_VIDEO_IDS.length === 0) return videos;

  const rank = new Map(PREFERRED_VIDEO_IDS.map((id, index) => [id, index]));
  return videos
    .map((video, index) => ({ video, index }))
    .sort((a, b) => {
      const rankA = rank.get(a.video.id);
      const rankB = rank.get(b.video.id);
      if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
      if (rankA !== undefined) return -1;
      if (rankB !== undefined) return 1;
      return a.index - b.index;
    })
    .map(({ video }) => video);
}

const normalized = (catalog as CuratedVideoEntry[]).map(normalizeCatalogEntry);

/** Returns catalog videos with resolved category metadata. */
export function getEnrichedCatalog(): VideoWithCategory[] {
  return normalized.map(enrichVideo);
}

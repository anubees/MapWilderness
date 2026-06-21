/**
 * Groups catalog videos into map "places" (one marker per placeId).
 * Place names are derived from placeName, shared tags, or the video title prefix.
 */
import { findVideoById, getAllVideos, VideoWithCategory } from './data';

export type VideoWithRegion = VideoWithCategory;

export interface PlaceGroup {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  categoryName: string;
  videos: VideoWithCategory[];
}

/** Tags too generic to use as a place label when inferring names from the catalog. */
const GENERIC_TAGS = new Set([
  'hiking', 'backpacking', 'waterfall', 'guide', 'smokies', 'virginia', 'kentucky',
  'tennessee', 'utah', 'arizona', 'colorado', 'AT', 'wilderness', 'arches', 'views',
  'balds', '360 views', 'scrambling', 'summit', 'exposure', 'sunrise', 'sandstone',
  'hoodoos', 'buttes', 'mountaineering', '14er', 'granite dome', 'old growth',
  'hemlock', 'marion', 'pisgah', 'waterfall', 'cables', 'Varies'
]);

/**
 * Picks a display name for a cluster of videos at the same coordinates.
 * Prefers explicit placeName, then tags shared by every video in the group.
 */
function derivePlaceName(videos: VideoWithCategory[]): string {
  const named = videos.find(v => v.placeName);
  if (named?.placeName) return named.placeName;

  const tagCounts = new Map<string, number>();
  for (const video of videos) {
    for (const tag of video.tags) {
      if (GENERIC_TAGS.has(tag)) continue;
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const shared = [...tagCounts.entries()]
    .filter(([, count]) => count === videos.length)
    .sort((a, b) => b[0].length - a[0].length);

  if (shared.length > 0) {
    return shared[0][0].replace(/\b\w/g, c => c.toUpperCase());
  }

  return videos[0].title.split('—')[0].trim();
}

/** Builds a PlaceGroup from videos sharing the same placeId. */
function buildPlaceGroup(videos: VideoWithCategory[]): PlaceGroup {
  const sorted = [...videos].sort((a, b) => a.title.localeCompare(b.title));
  const lat = sorted.reduce((sum, v) => sum + v.lat, 0) / sorted.length;
  const lng = sorted.reduce((sum, v) => sum + v.lng, 0) / sorted.length;

  return {
    id: sorted[0].placeId,
    name: derivePlaceName(sorted),
    lat,
    lng,
    category: sorted[0].category,
    categoryName: sorted[0].categoryName,
    videos: sorted
  };
}

/** Clusters videos by placeId into sorted PlaceGroup list. */
export function groupByPlace(videos: VideoWithCategory[]): PlaceGroup[] {
  const buckets = new Map<string, VideoWithCategory[]>();

  for (const video of videos) {
    const list = buckets.get(video.placeId) ?? [];
    list.push(video);
    buckets.set(video.placeId, list);
  }

  return [...buckets.values()]
    .map(buildPlaceGroup)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Returns the place group containing a given video id. */
export function getPlaceForVideo(videoId: string): PlaceGroup | undefined {
  const video = findVideoById(videoId);
  if (!video) return undefined;
  const atPlace = getAllVideos().filter(v => v.placeId === video.placeId);
  return buildPlaceGroup(atPlace);
}

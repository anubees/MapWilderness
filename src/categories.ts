/**
 * Wilderness category definitions and per-video category assignments.
 * Category ids come from videos.catalog.json → categories[]; colors drive map markers.
 */
import catalog from './videos.catalog.json';
import { CuratedVideoEntry } from './types';

export interface WildernessCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

export const WILDERNESS_CATEGORIES: WildernessCategory[] = [
  {
    id: 'lush-green',
    name: 'Lush Green',
    description: 'Forests, balds, waterfalls, and old-growth woodland',
    color: '#52d593'
  },
  {
    id: 'mountains',
    name: 'Mountains',
    description: 'Summits, ridges, scrambles, and high-country wilderness',
    color: '#68d8ff'
  },
  {
    id: 'red-rock',
    name: 'Red Rock Country',
    description: 'Sandstone arches, hoodoos, and vermillion cliffs',
    color: '#e06b4f'
  },
  {
    id: 'desert',
    name: 'Desert',
    description: 'Arid plateaus, buttes, and open desert hiking',
    color: '#f7c873'
  },
  {
    id: 'caves',
    name: 'Caves',
    description: 'Cave wilderness, grottos, and alcove hikes',
    color: '#a88bff'
  },
  {
    id: 'canyons',
    name: 'Canyons',
    description: 'Deep gorges, rim hikes, and canyon country',
    color: '#ff8fab'
  }
];

const VIDEO_CATEGORY_MAP: Record<string, string[]> = Object.fromEntries(
  (catalog as CuratedVideoEntry[]).map(entry => [entry.id, entry.categories])
);

/** Returns the wilderness category definition for an id. */
export function getCategory(categoryId: string): WildernessCategory | undefined {
  return WILDERNESS_CATEGORIES.find(c => c.id === categoryId);
}

/** Returns the marker/UI color for a category id. */
export function getCategoryColor(categoryId: string): string {
  return getCategory(categoryId)?.color ?? '#52d593';
}

/** Returns all category ids assigned to a catalog video. */
export function getCategoryIdsForVideo(videoId: string): string[] {
  return VIDEO_CATEGORY_MAP[videoId] ?? ['lush-green'];
}

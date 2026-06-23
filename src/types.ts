/**
 * Shared app types — video catalog shape, enriched runtime records, and UI state.
 */
export interface WildernessVideo {
  id: string;
  title: string;
  creator: string;
  youtubeId: string;
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  distance: string;
  thumbnail: string;
  tags: string[];
  lat: number;
  lng: number;
  placeId: string;
  placeName?: string;
  /** Map region id — defaults to "us". See geo/regions.config.ts */
  regionId: string;
  /** Area code within the region (US: two-letter state code). */
  stateCode: string;
}

/** One row in videos.catalog.json. Thumbnail URL is derived at load time. */
export interface CuratedVideoEntry {
  id: string;
  title: string;
  creator: string;
  youtubeId: string;
  duration: string;
  difficulty: WildernessVideo['difficulty'];
  distance: string;
  tags: string[];
  lat: number;
  lng: number;
  stateCode: string;
  categories: string[];
  regionId?: string;
  placeId?: string;
  placeName?: string;
}

export type AppView = 'explore' | 'watch' | 'saved';

export interface AppState {
  activeView: AppView;
  currentCategory: string | null;
  selectedState: string | null;
  showAllStates: boolean;
  difficultyFilter: string;
  favorites: string[];
  recentVideos: string[];
  selectedVideoId: string | null;
  playerStarted: boolean;
  onlineStatus: boolean;
}

/**
 * Map region definitions.
 *
 * Phase 1 ships with the US (state boundaries + stateCode on each video).
 * To add another country later:
 *   1. Add a MapRegion entry below (GeoJSON URL + name→code lookup + bounds).
 *   2. Set regionId on catalog videos (defaults to 'us').
 *   3. Use areaCode on videos (today: same as stateCode for US entries).
 */

import {
  US_DEFAULT_BOUNDS,
  US_STATE_CODE_TO_NAME,
  US_STATES_GEOJSON_URL,
  usStateCodeFromGeoName
} from './us-states';

export interface MapRegion {
  id: string;
  label: string;
  geoJsonUrl: string;
  /** GeoJSON feature property name that holds the area label (e.g. state name). */
  featureNameProperty: string;
  codeFromFeatureName: (name: string) => string | undefined;
  codeToLabel: Record<string, string>;
  defaultBounds: [[number, number], [number, number]];
}

export const US_MAP_REGION: MapRegion = {
  id: 'us',
  label: 'United States',
  geoJsonUrl: US_STATES_GEOJSON_URL,
  featureNameProperty: 'name',
  codeFromFeatureName: usStateCodeFromGeoName,
  codeToLabel: US_STATE_CODE_TO_NAME,
  defaultBounds: US_DEFAULT_BOUNDS
};

/** Regions rendered as clickable boundary layers. Extend this array in future phases. */
export const MAP_REGIONS: MapRegion[] = [US_MAP_REGION];

export const DEFAULT_MAP_REGION = US_MAP_REGION;

/** Looks up a map region config by id. */
export function getMapRegion(id: string): MapRegion | undefined {
  return MAP_REGIONS.find(region => region.id === id);
}

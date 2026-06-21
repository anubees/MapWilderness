/**
 * Resolves human-readable labels for map area codes (state/province/etc.).
 */

import { DEFAULT_MAP_REGION, getMapRegion } from './regions.config';

/** Human-readable label for an area code within a map region. */
function getAreaLabel(regionId: string, areaCode: string): string {
  const region = getMapRegion(regionId) ?? DEFAULT_MAP_REGION;
  return region.codeToLabel[areaCode] ?? areaCode;
}

/** US videos store stateCode; regionId defaults to 'us'. */
export function getVideoAreaLabel(regionId: string | undefined, areaCode: string): string {
  return getAreaLabel(regionId ?? DEFAULT_MAP_REGION.id, areaCode);
}

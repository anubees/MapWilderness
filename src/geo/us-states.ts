/**
 * US state codes and GeoJSON boundary source.
 * Used by the US map region in regions.config.ts.
 */

export const US_STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY'
};

export const US_STATE_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATE_NAME_TO_CODE).map(([name, code]) => [code, name])
);

/** Maps a GeoJSON state name to its two-letter code. */
export function usStateCodeFromGeoName(name: string): string | undefined {
  return US_STATE_NAME_TO_CODE[name];
}

export const US_STATES_GEOJSON_URL =
  'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';

/** Continental US + Alaska/Hawaii padding for initial map framing. */
export const US_DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [24.5, -125],
  [49.5, -66]
];

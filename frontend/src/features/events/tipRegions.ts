/** Régions géographiques Traumatec (colonne Region du fichier Projects.xlsx / events.region). */
export const TIP_GEO_REGIONS = [
  "English speaking Africa",
  "French speaking Africa",
  "Asia",
  "Europe",
  "Middle East",
  "North America",
  "Latin America",
  "Pacific Islands",
] as const;

export type TipGeoRegion = (typeof TIP_GEO_REGIONS)[number];

export function isTipGeoRegion(value: string): value is TipGeoRegion {
  return (TIP_GEO_REGIONS as readonly string[]).includes(value);
}

/** Shared parsing for Nominatim address objects (OpenStreetMap). */

export type NominatimAddress = Record<string, string | undefined>;

export function cityFromAddress(addr: NominatimAddress): string {
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.city_district ||
    addr.county ||
    ""
  );
}

export function neighborhoodFromAddress(addr: NominatimAddress): string {
  return (
    addr.suburb ||
    addr.neighbourhood ||
    addr.quarter ||
    addr.hamlet ||
    ""
  );
}

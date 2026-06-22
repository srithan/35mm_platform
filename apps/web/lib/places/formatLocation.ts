export interface PlaceAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  "ISO3166-2-lvl4"?: string;
}

export interface PlaceSuggestion {
  id: string;
  /** Shown in autocomplete — may include country for disambiguation. */
  label: string;
  /** Saved to profile — city and abbreviated region only. */
  value: string;
}

const STREET_LEVEL_TYPES = new Set([
  "house",
  "building",
  "road",
  "footway",
  "residential",
  "suburb",
  "neighbourhood",
  "quarter",
]);

const US_STATE_ABBREV: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

function formatStateLabel(address: PlaceAddress): string | null {
  const iso = address["ISO3166-2-lvl4"];
  if (typeof iso === "string" && iso.indexOf("-") >= 0) {
    const code = iso.split("-").pop()?.trim();
    if (code && code.length >= 2 && code.length <= 4) {
      return code;
    }
  }

  const state = address.state?.trim();
  if (!state) return null;
  if (state.length <= 3) return state;

  if (address.country === "United States") {
    return US_STATE_ABBREV[state] ?? state;
  }

  return state;
}

export function formatPlaceSuggestion(item: {
  place_id?: number | string;
  addresstype?: string;
  type?: string;
  address?: PlaceAddress;
}): PlaceSuggestion | null {
  const address = item.address;
  if (!address) return null;

  const addressType = item.addresstype ?? item.type ?? "";
  if (STREET_LEVEL_TYPES.has(addressType)) return null;

  const locality =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county;
  if (!locality) return null;

  const savedParts: string[] = [locality];
  const stateLabel = formatStateLabel(address);
  if (stateLabel && stateLabel !== locality) {
    savedParts.push(stateLabel);
  }

  const value = savedParts.join(", ");
  const label =
    address.country && address.country.trim().length > 0
      ? value + " · " + address.country.trim()
      : value;
  const id = item.place_id != null ? String(item.place_id) : value;

  return { id, label, value };
}

export function dedupePlaceSuggestions(items: PlaceSuggestion[]): PlaceSuggestion[] {
  const seen = new Set<string>();
  const next: PlaceSuggestion[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const key = item.value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }

  return next;
}

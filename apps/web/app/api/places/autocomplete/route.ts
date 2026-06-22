import { NextRequest, NextResponse } from "next/server";
import {
  dedupePlaceSuggestions,
  formatPlaceSuggestion,
  type PlaceSuggestion,
} from "@/lib/places/formatLocation";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "35mm/1.0 (profile location autocomplete; contact@35mm.app)";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ results: [] satisfies PlaceSuggestion[] });
  }

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("featuretype", "settlement");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Location search unavailable" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as Array<{
      place_id?: number;
      addresstype?: string;
      type?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        county?: string;
        state?: string;
        country?: string;
        "ISO3166-2-lvl4"?: string;
      };
    }>;

    const results = dedupePlaceSuggestions(
      data
        .map(formatPlaceSuggestion)
        .filter((item): item is PlaceSuggestion => item != null)
    ).slice(0, 6);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Places autocomplete error:", error);
    return NextResponse.json(
      { error: "Failed to search locations" },
      { status: 502 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const { path } = await params;
  const pathStr = path.join("/");
  const url = new URL(`${TMDB_BASE}/${pathStr}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");

  // Forward query params (e.g. page, with_genres)
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "path") url.searchParams.set(key, value);
  });

  try {
    const res = await fetch(url.toString());
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      console.error("TMDB non-JSON response:", res.status, text.slice(0, 200));
      return NextResponse.json(
        { error: "Invalid response from TMDB", status: res.status },
        { status: 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("TMDB API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from TMDB" },
      { status: 502 }
    );
  }
}

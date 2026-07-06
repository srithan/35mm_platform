import { NextResponse } from 'next/server';
import { fetchExternalDetailsServer, type ExternalSearchResult, type ExternalSourceName } from '@/lib/data/externalSourceCore';

const sources: ExternalSourceName[] = ['TMDB', 'OMDb', 'IMDb ID', 'Open Library'];

export async function POST(request: Request) {
  try {
    const result = (await request.json()) as ExternalSearchResult;
    if (!result?.source || !sources.includes(result.source)) {
      return NextResponse.json({ error: 'Unknown external source.' }, { status: 400 });
    }

    const data = await fetchExternalDetailsServer(result);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'External details lookup failed.' },
      { status: 502 },
    );
  }
}

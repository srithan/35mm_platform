import { NextResponse } from 'next/server';
import { searchExternalFilmsServer, type ExternalSourceName } from '@/lib/data/externalSourceCore';

const sources: ExternalSourceName[] = ['TMDB', 'OMDb', 'IMDb ID', 'Open Library'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') as ExternalSourceName | null;
  const query = searchParams.get('query') || '';

  if (!source || !sources.includes(source)) {
    return NextResponse.json({ error: 'Unknown external source.' }, { status: 400 });
  }

  try {
    const data = await searchExternalFilmsServer(query, source);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'External search failed.' },
      { status: 502 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { artistMemoryRepository } from '@/repositories/memory/artist-memory.repository';
import { ArtistService } from '@/services/artist.service';

const artistService = new ArtistService(artistMemoryRepository);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pathname: string }> }
) {
  try {
    const { pathname } = await params;
    const artist = await artistService.getArtistByPathname(pathname);

    if (!artist) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: artist });
  } catch (error) {
    console.error('Error fetching artist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artist' },
      { status: 500 }
    );
  }
}

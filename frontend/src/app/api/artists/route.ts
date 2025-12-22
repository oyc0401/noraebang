import { NextResponse } from 'next/server';
import { artistMemoryRepository } from '@/repositories/memory/artist-memory.repository';
import { ArtistService } from '@/services/artist.service';

const artistService = new ArtistService(artistMemoryRepository);

export async function GET() {
  try {
    const artists = await artistService.getAllArtists();
    return NextResponse.json({ data: artists });
  } catch (error) {
    console.error('Error fetching artists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artists' },
      { status: 500 }
    );
  }
}

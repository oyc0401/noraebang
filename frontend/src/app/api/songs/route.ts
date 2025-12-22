import { NextRequest, NextResponse } from 'next/server';
import { songMemoryRepository } from '@/repositories/memory/song-memory.repository';
import { SongService } from '@/services/song.service';

const songService = new SongService(songMemoryRepository);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const artistId = searchParams.get('artistId');

    let songs;

    if (artistId) {
      songs = await songService.getSongsByArtist(Number(artistId));
    } else if (query) {
      songs = await songService.searchSongs(query);
    } else {
      songs = await songService.getAllSongs();
    }

    return NextResponse.json({ data: songs });
  } catch (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}

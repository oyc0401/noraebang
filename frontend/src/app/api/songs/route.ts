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

    if (artistId && query) {
      // Both artistId and query: filter by artist first, then search within
      const artistSongs = await songService.getSongsByArtist(Number(artistId));
      const lowerQuery = query.toLowerCase();
      songs = artistSongs.filter(
        (song) =>
          song.title.toLowerCase().includes(lowerQuery) ||
          song.titleKo?.toLowerCase().includes(lowerQuery) ||
          song.titleNorm.toLowerCase().includes(lowerQuery)
      );
    } else if (artistId) {
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

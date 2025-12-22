import { NextRequest, NextResponse } from 'next/server';
import { songMemoryRepository } from '@/repositories/memory/song-memory.repository';
import { SongService } from '@/services/song.service';

const songService = new SongService(songMemoryRepository);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const song = await songService.getSongById(Number(id));

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    return NextResponse.json({ data: song });
  } catch (error) {
    console.error('Error fetching song:', error);
    return NextResponse.json(
      { error: 'Failed to fetch song' },
      { status: 500 }
    );
  }
}

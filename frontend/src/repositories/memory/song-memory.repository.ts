import { SongRepository } from '../song.repository';
import { Song } from '@/types/models';
import { allSongs } from './data';

export class SongMemoryRepository implements SongRepository {
  private songs: Song[] = allSongs;

  async findAll(): Promise<Song[]> {
    return [...this.songs];
  }

  async findById(id: number): Promise<Song | null> {
    return this.songs.find((song) => song.id === id) || null;
  }

  async searchByTitle(query: string): Promise<Song[]> {
    const lowerQuery = query.toLowerCase();
    return this.songs.filter(
      (song) =>
        song.title.toLowerCase().includes(lowerQuery) ||
        song.titleKo?.toLowerCase().includes(lowerQuery) ||
        song.titleNorm.toLowerCase().includes(lowerQuery)
    );
  }

  async findByArtistId(artistId: number): Promise<Song[]> {
    return this.songs.filter((song) => song.primaryArtistId === artistId);
  }
}

// Singleton instance
export const songMemoryRepository = new SongMemoryRepository();

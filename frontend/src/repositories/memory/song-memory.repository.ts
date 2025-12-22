import { SongRepository } from '../song.repository';
import { Song } from '@/types/models';
import { allSongs } from './data';

export class SongMemoryRepository implements SongRepository {
  private songs: Song[] = allSongs;

  async findAll(): Promise<Song[]> {
    // Simulate async operation
    await this.delay(100);
    return [...this.songs];
  }

  async findById(id: number): Promise<Song | null> {
    await this.delay(50);
    return this.songs.find((song) => song.id === id) || null;
  }

  async searchByTitle(query: string): Promise<Song[]> {
    await this.delay(100);
    const lowerQuery = query.toLowerCase();
    return this.songs.filter(
      (song) =>
        song.title.toLowerCase().includes(lowerQuery) ||
        song.titleKo?.toLowerCase().includes(lowerQuery) ||
        song.titleNorm.toLowerCase().includes(lowerQuery)
    );
  }

  async findByArtistId(artistId: number): Promise<Song[]> {
    await this.delay(100);
    return this.songs.filter((song) => song.primaryArtistId === artistId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const songMemoryRepository = new SongMemoryRepository();

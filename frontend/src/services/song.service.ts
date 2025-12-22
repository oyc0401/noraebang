import { SongRepository } from '@/repositories/song.repository';
import { Song } from '@/types/models';

export class SongService {
  constructor(private songRepository: SongRepository) {}

  async getAllSongs(): Promise<Song[]> {
    return this.songRepository.findAll();
  }

  async getSongById(id: number): Promise<Song | null> {
    return this.songRepository.findById(id);
  }

  async searchSongs(query: string): Promise<Song[]> {
    if (!query.trim()) {
      return this.getAllSongs();
    }
    return this.songRepository.searchByTitle(query);
  }

  async getSongsByArtist(artistId: number): Promise<Song[]> {
    return this.songRepository.findByArtistId(artistId);
  }
}

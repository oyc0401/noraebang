import { ArtistRepository } from '@/repositories/artist.repository';
import { Artist } from '@/types/models';
import { allArtists } from './data';

export class ArtistMemoryRepository implements ArtistRepository {
  private artists: Artist[] = allArtists;

  async findAll(): Promise<Artist[]> {
    return this.artists;
  }

  async findById(id: number): Promise<Artist | null> {
    return this.artists.find((artist) => artist.id === id) || null;
  }

  async findByPathname(pathname: string): Promise<Artist | null> {
    return this.artists.find((artist) => artist.pathname === pathname) || null;
  }
}

export const artistMemoryRepository = new ArtistMemoryRepository();

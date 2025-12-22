import { ArtistRepository } from '@/repositories/artist.repository';
import { Artist } from '@/types/models';

export class ArtistService {
  constructor(private artistRepository: ArtistRepository) {}

  async getAllArtists(): Promise<Artist[]> {
    return this.artistRepository.findAll();
  }

  async getArtistById(id: number): Promise<Artist | null> {
    return this.artistRepository.findById(id);
  }

  async getArtistByPathname(pathname: string): Promise<Artist | null> {
    return this.artistRepository.findByPathname(pathname);
  }
}

import { Injectable, Inject } from '@nestjs/common';
import type { ArtistRepository } from '../repositories/artist.repository';
import { ARTIST_REPOSITORY } from '../repositories/tokens';

@Injectable()
export class ArtistsService {
  constructor(
    @Inject(ARTIST_REPOSITORY) private artistRepository: ArtistRepository
  ) {}

  async findAll() {
    return this.artistRepository.findAll();
  }

  async findById(id: number) {
    return this.artistRepository.findById(id);
  }

  async findByPathname(pathname: string) {
    return this.artistRepository.findByPathname(pathname);
  }
}

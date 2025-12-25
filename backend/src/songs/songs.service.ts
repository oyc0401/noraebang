import { Injectable, Inject } from '@nestjs/common';
import type { SongRepository } from '../repositories/song.repository';
import { SONG_REPOSITORY } from '../repositories/tokens';

@Injectable()
export class SongsService {
  constructor(
    @Inject(SONG_REPOSITORY) private songRepository: SongRepository
  ) {}

  async findAll() {
    return this.songRepository.findAll();
  }

  async findById(id: number) {
    return this.songRepository.findById(id);
  }

  async searchByTitle(query: string) {
    return this.songRepository.searchByTitle(query);
  }

  async findByArtistId(artistId: number) {
    return this.songRepository.findByArtistId(artistId);
  }
}

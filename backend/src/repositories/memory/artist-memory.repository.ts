import { Injectable } from '@nestjs/common';
import { ArtistRepository } from '../artist.repository';
import type { Artist } from '@prisma/client';
import { allArtists } from './data';

@Injectable()
export class ArtistMemoryRepository implements ArtistRepository {
  private artists: Artist[] = allArtists as Artist[];

  async findAll(): Promise<Artist[]> {
    return this.artists;
  }

  async findById(id: number): Promise<Artist | null> {
    return this.artists.find((artist) => artist.id === id) || null;
  }

  async findByAlias(alias: string): Promise<Artist | null> {
    return this.artists.find((artist) => artist.alias === alias) || null;
  }
}
